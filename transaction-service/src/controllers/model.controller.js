import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ML_FASTAPI_URL = process.env.ML_FASTAPI_URL || "http://localhost:8000";

// resolve paths to the ml-service files
// adjust this path if your folder structure is different
const ML_SERVICES_DIR = path.resolve(__dirname, "../../ml-service");
const METRICS_LOG_PATH = path.join(ML_SERVICES_DIR, "metrics_history.json");
const CHAMPION_META_PATH = path.join(ML_SERVICES_DIR, "champion_meta.json");

// ─── HELPER ───────────────────────────────────────────────────────────────

const readJsonFile = (filePath) => {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
};

// ─── GET /model/metrics ───────────────────────────────────────────────────
// full training run history from metrics_history.json
// optional ?limit= to get only the last N runs
// optional ?promoted_only=true to get only runs that updated the champion

export const getMetrics = async (req, res) => {
  try {
    const history = readJsonFile(METRICS_LOG_PATH);

    if (!history) {
      return res.status(404).json({
        success: false,
        error: "metrics_history.json not found - model has not been trained yet",
      });
    }

    let data = history;

    // filter promoted only if requested
    if (req.query.promoted_only === "true") {
      data = data.filter((run) => run.promoted === true);
    }

    // return only last N runs if limit specified
    const limit = parseInt(req.query.limit);
    if (limit && limit > 0) {
      data = data.slice(-limit);
    }

    // compute summary stats across all runs
    const totalRuns = history.length;
    const promotedRuns = history.filter((r) => r.promoted).length;
    const latestRun = history[history.length - 1];
    const bestRun = history.reduce(
      (best, run) => (run.roc_auc > best.roc_auc ? run : best),
      history[0]
    );

    res.json({
      success: true,
      summary: {
        total_runs: totalRuns,
        promoted_runs: promotedRuns,
        latest_run_at: latestRun?.run_at,
        best_auc: bestRun?.roc_auc,
        best_auc_run_at: bestRun?.run_at,
      },
      count: data.length,
      data,
    });
  } catch (err) {
    console.error("getMetrics error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /model/champion ──────────────────────────────────────────────────
// current champion model metadata from champion_meta.json

export const getChampion = async (req, res) => {
  try {
    const champion = readJsonFile(CHAMPION_META_PATH);

    if (!champion) {
      return res.status(404).json({
        success: false,
        error: "champion_meta.json not found - no champion model exists yet",
      });
    }

    // compute improvement over time by comparing first promoted run to current
    const history = readJsonFile(METRICS_LOG_PATH);
    let firstPromotion = null;
    if (history) {
      firstPromotion = history.find((run) => run.promoted === true);
    }

    const improvement = firstPromotion
      ? parseFloat((champion.roc_auc - firstPromotion.roc_auc).toFixed(4))
      : null;

    res.json({
      success: true,
      data: {
        ...champion,
        // improvement in AUC from first promoted model to current champion
        auc_improvement_since_first: improvement,
      },
    });
  } catch (err) {
    console.error("getChampion error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /model/features ──────────────────────────────────────────────────
// top feature importances from the currently loaded model
// fetched from FastAPI /model/info - model lives in Python not Node

export const getFeatures = async (req, res) => {
  try {
    const mlResponse = await fetch(`${ML_FASTAPI_URL}/model/info`);

    if (!mlResponse.ok) {
      const err = await mlResponse.text();
      throw new Error(`ML service error ${mlResponse.status}: ${err}`);
    }

    const mlData = await mlResponse.json();

    // optional ?top= param to limit number of features returned (default 20)
    const top = Math.min(parseInt(req.query.top) || 20, mlData.top_features.length);
    const features = mlData.top_features.slice(0, top);

    // group features by type for easier frontend rendering
    const grouped = {
      numeric: features.filter((f) => !f.feature.includes("_") || [
        "amount_usd", "amount_ratio", "merchant_risk", "customer_age",
        "customer_income", "spend_to_income", "device_age_days",
        "account_age_days", "tx_hour", "tx_dow"
      ].includes(f.feature)),
      binary: features.filter((f) => [
        "device_new", "device_week", "account_new",
        "is_weekend", "is_late_night", "is_high_amount"
      ].includes(f.feature)),
      categorical: features.filter((f) =>
        ["currency", "merchant_category", "merchant_country", "device_type"]
          .some((cat) => f.feature.startsWith(cat + "_"))
      ),
    };

    res.json({
      success: true,
      model_version: mlData.model_version,
      count: features.length,
      data: features,
      grouped,
    });
  } catch (err) {
    console.error("getFeatures error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /model/health ────────────────────────────────────────────────────
// combines local file metadata with FastAPI health check
// tells you model version, when it was last trained, and if the service is up

export const getModelHealth = async (req, res) => {
  try {
    const champion = readJsonFile(CHAMPION_META_PATH);
    const history = readJsonFile(METRICS_LOG_PATH);

    // ping FastAPI health endpoint
    let mlServiceStatus = "unreachable";
    let mlServiceVersion = null;

    try {
      const mlResponse = await fetch(`${ML_FASTAPI_URL}/health`, {
        signal: AbortSignal.timeout(3000), // 3 second timeout
      });

      if (mlResponse.ok) {
        const mlData = await mlResponse.json();
        mlServiceStatus = "healthy";
        mlServiceVersion = mlData.model_version;
      } else {
        mlServiceStatus = "unhealthy";
      }
    } catch {
      mlServiceStatus = "unreachable";
    }

    const lastRun = history ? history[history.length - 1] : null;

    res.json({
      success: true,
      data: {
        ml_service: {
          status: mlServiceStatus,
          url: ML_FASTAPI_URL,
          model_version: mlServiceVersion,
        },
        champion: champion
          ? {
              roc_auc: champion.roc_auc,
              precision: champion.precision_fraud,
              recall: champion.recall_fraud,
              f1: champion.f1_fraud,
              trained_at: champion.run_at,
              promoted: champion.promoted,
            }
          : null,
        last_training_run: lastRun
          ? {
              run_at: lastRun.run_at,
              roc_auc: lastRun.roc_auc,
              promoted: lastRun.promoted,
              cv_auc_mean: lastRun.cv_auc_mean,
              cv_auc_std: lastRun.cv_auc_std,
            }
          : null,
        total_training_runs: history ? history.length : 0,
      },
    });
  } catch (err) {
    console.error("getModelHealth error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};