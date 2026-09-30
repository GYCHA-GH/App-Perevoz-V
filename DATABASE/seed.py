"""Добавляет в PostgreSQL 100 демонстрационных заявок.

Запуск из корня проекта: python DATABASE/seed.py
Зависимости: pip install -r DATABASE/requirements.txt
"""

import os
import random
from datetime import datetime, timedelta, timezone

import psycopg2
from faker import Faker
from psycopg2.extras import execute_values

fake = Faker("ru_RU")


def main():
    rows = []
    now = datetime.now(timezone.utc)

    for _ in range(100):
        created_at = now - timedelta(
            days=random.randint(0, 365),
            seconds=random.randint(0, 86_399),
        )
        rows.append(
            (
                fake.name(),
                fake.phone_number()[:50],
                fake.email()[:254],
                fake.paragraph(nb_sentences=3),
                created_at,
            )
        )

    connection = psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "5433")),
        dbname=os.getenv("POSTGRES_DB", "postgres"),
        user=os.getenv("POSTGRES_USER", "postgres"),
        password=os.getenv("POSTGRES_PASSWORD", "1234"),
    )

    try:
        with connection:
            with connection.cursor() as cursor:
                execute_values(
                    cursor,
                    """
                    INSERT INTO requests
                        (full_name, phone, email, message, created_at)
                    VALUES %s
                    """,
                    rows,
                )
        print(f"Добавлено тестовых записей: {len(rows)}")
    finally:
        connection.close()


if __name__ == "__main__":
    main()
