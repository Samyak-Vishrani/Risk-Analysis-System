import psycopg2
from faker import Faker
import random

fake = Faker()

from dotenv import load_dotenv
import os

load_dotenv()

def get_connection():
    DB_HOST = os.getenv("DB_HOST")
    DB_USER = os.getenv("DB_USER")
    DB_NAME = os.getenv("DB_NAME")
    DB_PASSWORD = os.getenv("DB_PASSWORD")
    DB_PORT = os.getenv("DB_PORT")
    return psycopg2.connect(
        host=DB_HOST,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        port=DB_PORT
    )


def generate_customers(cursor, num_customers = 10000):
    num_customers = 10000
    customers = []

    for i in range(num_customers):
        customers.append((
            fake.name(),
            random.randint(18, 70),
            random.randint(30000, 200000),
            fake.city(),
            fake.date_time_this_decade()
        ))

    cursor.executemany(""" 
    INSERT INTO customers (name, age, income, location, account_created)
    VALUES(%s, %s, %s, %s, %s)
    """, customers
    )
    print("Customers have been added")


def generate_merchants(cursor, num_merchants = 200):
    categories = [
        "electronics",
        "food",
        "groceries",
        "travel",
        "fashion",
        "luxury",
        "entertainment"
    ]

    merchants = []

    for _ in range(num_merchants):
        merchant_name = fake.company()
        category = random.choice(categories)
        country = fake.country()
        risk_rating = round(random.uniform(0.1, 0.9), 2)

        merchants.append((merchant_name, category, country, risk_rating))

    cursor.executemany("""
    INSERT INTO merchants (merchant_name, category, country, risk_rating)
    VALUES(%s, %s, %s, %s)
    """, merchants
    )

    print("Merchants Added")


def generate_devices(cursor, num_devices = 20000, num_customers = 10000):
    device_types = ["mobile", "tablet", "laptop"]

    devices = []

    customer_devices = {}

    for i in range(num_devices):
        device_id = f"DEV{i}"
        customer_id = random.randint(1, num_customers)
        device_type = random.choice(device_types)
        registered_at = fake.date_time_this_decade()

        devices.append((device_id, customer_id, device_type, registered_at))

        if customer_id not in customer_devices:
            customer_devices[customer_id] = []
        
        customer_devices[customer_id].append(device_id)


    cursor.executemany("""
    INSERT INTO devices(device_id, customer_id, device_type, registered_at)
    VALUES(%s, %s, %s, %s)                   
    """, devices
    )

    print("Devices added")

    return customer_devices


def generate_transactions(cursor, customer_devices, num_transactions=200000, num_customers=10000, num_merchants=200):
    
    cursor.execute("SELECT merchant_id, country, risk_rating FROM merchants")
    merchant_data = cursor.fetchall()

    merchant_country_map = {}
    merchant_risk_map = {}

    for m_id, country, risk in merchant_data:
        merchant_country_map[m_id] = country
        merchant_risk_map[m_id] = float(risk)
    
    country_currency_map = {
        "United States": "USD",
        "India": "INR",
        "United Kingdom": "GBP",
        "Germany": "EUR",
        "Japan": "JPY",
        "United Arab Emirates": "AED"
    }
    
    currency_ranges = {
        "USD": (5, 5000),
        "INR": (100, 200000),
        "EUR": (5, 4000),
        "GBP": (5, 3500),
        "JPY": (500, 300000),
        "AED": (20, 15000)
    }

    transactions = []

    for _ in range(num_transactions):
        customer_id = random.randint(1, num_customers)
        merchant_id = random.randint(1, num_merchants)

        device_list = customer_devices.get(customer_id)
        if device_list:
            device_id = random.choice(device_list)
        else:
            continue

        merchant_country = merchant_country_map.get(merchant_id, "United States")
        currency = country_currency_map.get(merchant_country, "USD")
        min_amt, max_amt = currency_ranges.get(currency, (5, 5000))
        amount = round(random.uniform(min_amt, max_amt), 2)

        location = fake.city()
        transaction_time = fake.date_time_this_year()

        fraud_probability = 0.01

        if amount > (0.7 * max_amt):
            fraud_probability += 0.15
        elif amount > (0.4 * max_amt):
            fraud_probability += 0.08

        merchant_risk = merchant_risk_map.get(merchant_id, 0.3)
        fraud_probability += merchant_risk * 0.2

        #random anomaly
        if random.random() < 0.01:
            fraud_probability += 0.2
        
        fraud_probability = min(fraud_probability, 0.9)
        is_fraud = random.random() < fraud_probability

        transactions.append((
            customer_id,
            merchant_id,
            device_id,
            amount,
            currency,
            location,
            transaction_time,
            is_fraud
        ))

    cursor.executemany("""
    INSERT INTO transactions
    (customer_id, merchant_id, device_id, amount, currency, location, transaction_time, is_fraud)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """, transactions
    )

    print("Transactions added")


def main():
    conn = get_connection()
    cursor = conn.cursor()

    try:
        print("Data generation start")

        generate_customers(cursor)
        conn.commit()

        generate_merchants(cursor)
        conn.commit()

        customer_devices = generate_devices(cursor)
        conn.commit()

        generate_transactions(cursor, customer_devices)
        conn.commit()

        print("Data generation complete")

    except Exception as e:
        conn.rollback()
        print("Error occurred:", e)

    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    main()

