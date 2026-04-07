# Real-Time Financial Risk & Analytics Platform

## Overview

This project is a distributed system designed to simulate and analyze financial transactions in real time, with a focus on fraud detection. It combines backend engineering, data pipelines, and machine learning into a single architecture.

Transactions are ingested through a Node.js API, processed asynchronously using a Redis-backed queue, scored by a machine learning service, and stored for further analysis. The system is built to reflect how modern fintech platforms handle risk scoring at scale.

---

## Architecture

The system is composed of the following components:

* **Frontend (React)** – optional dashboard for visualization
* **Transaction Service (Node.js + Express)** – API layer for ingesting transactions
* **PostgreSQL** – primary data store
* **Redis (BullMQ)** – queue for asynchronous processing
* **Worker Service (Node.js)** – background job processor
* **ML Service (FastAPI)** – model inference service

### Flow

1. A transaction is submitted via API
2. The transaction is validated and stored in PostgreSQL
3. A job is pushed to Redis
4. The worker consumes the job and fetches transaction data
5. The worker calls the ML service for fraud prediction
6. The ML service returns probability and risk level
7. Results are stored in the database

---

## Features

* Asynchronous transaction processing using queues
* Multi-currency support with normalized features
* Fraud detection using a trained machine learning model
* Modular microservice-based architecture
* Scalable design with clear separation of concerns
* Model retraining pipeline with performance tracking
* Risk classification into multiple levels (LOW, MEDIUM, HIGH, CRITICAL)

---

## Tech Stack

### Backend

* Node.js
* Express.js
* PostgreSQL
* Redis (BullMQ)

### Machine Learning

* Python
* FastAPI
* scikit-learn
* pandas, NumPy

### Frontend

* React

### DevOps

* Docker (for Redis and future containerization)

---


---

## Machine Learning Pipeline

### Training

The training pipeline performs the following steps:

* Extracts transaction and merchant data from PostgreSQL
* Applies feature engineering:

  * amount normalization across currencies
  * spend-to-income ratio
  * categorical encoding
* Trains a classification model (Random Forest)
* Evaluates using metrics such as ROC-AUC
* Saves model artifacts for inference

### Inference

* The FastAPI service loads the trained model at startup
* Receives transaction features from the worker
* Returns:

  * fraud probability
  * risk classification

---

## Data Model (Simplified)

### transactions

* transaction_id
* customer_id
* merchant_id
* device_id
* amount
* currency
* location
* transaction_time
* is_fraud

### merchants

* merchant_id
* risk_rating

### risk_scores

* transaction_id
* fraud_probability
* risk_level
* scored_at

---

## Notes

* The current dataset is simulated and intended for experimentation
* Model performance depends on the quality of generated data
* System is designed for learning purposes but follows production patterns

---

## Summary

This project demonstrates how to build an end-to-end data system that combines backend services, asynchronous processing, and machine learning. It focuses on practical system design decisions such as decoupling services, handling scale, and integrating ML into production workflows.
