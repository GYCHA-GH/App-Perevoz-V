"""Проверяет пользовательский сценарий через браузер Selenium.

Скрипт очищает requests, отправляет 100 заявок через HTML-форму,
нажимает «Передать в DATABASE» и проверяет итоговое количество записей.

Запуск из корня проекта:
    python DATABASE/selenium_test.py
"""

import json
import os
import time

import psycopg2
from faker import Faker
from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

APP_URL = os.getenv("APP_URL", "http://localhost:3000")
TOTAL_RECORDS = 100
fake = Faker("ru_RU")


def database_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "5433")),
        dbname=os.getenv("POSTGRES_DB", "postgres"),
        user=os.getenv("POSTGRES_USER", "postgres"),
        password=os.getenv("POSTGRES_PASSWORD", "1234"),
    )


def clear_database():
    with database_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("TRUNCATE TABLE requests RESTART IDENTITY")
    print("Старые записи удалены из PostgreSQL.")


def clear_app_queue():
    # Предыдущий незавершённый запуск мог оставить заявки в очереди APP.
    queue_file = os.path.join(os.path.dirname(__file__), "..", "APP", "temporary.json")
    with open(queue_file, "w", encoding="utf-8") as file:
        json.dump([], file, ensure_ascii=False, indent=4)
    print("Очередь APP очищена.")


def create_driver():
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1280,900")
    return webdriver.Chrome(options=options)


def fill_form(driver, wait, record):
    driver.get(APP_URL)
    wait.until(EC.presence_of_element_located((By.NAME, "fullName")))

    driver.find_element(By.NAME, "fullName").send_keys(record["fullName"])
    driver.find_element(By.NAME, "phone").send_keys(record["phone"])
    driver.find_element(By.NAME, "email").send_keys(record["email"])
    driver.find_element(By.NAME, "message").send_keys(record["message"])
    driver.find_element(By.CSS_SELECTOR, 'form[action="/request"] button[type="submit"]').click()

    wait.until(EC.url_to_be(f"{APP_URL}/"))


def transfer_records(driver, wait):
    # На странице форма передачи расположена ниже первого экрана.
    # Прокручиваем к кнопке перед кликом, чтобы headless Chrome мог её нажать.
    button = wait.until(
        EC.presence_of_element_located(
            (By.CSS_SELECTOR, 'form[action="/transfer"] button[type="submit"]')
        )
    )
    driver.execute_script(
        "arguments[0].scrollIntoView({block: 'center', inline: 'nearest'});",
        button,
    )
    wait.until(EC.element_to_be_clickable(
        (By.CSS_SELECTOR, 'form[action="/transfer"] button[type="submit"]')
    )).click()
    wait.until(EC.url_to_be(f"{APP_URL}/"))
    time.sleep(1)


def count_records():
    with database_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM requests")
            return cursor.fetchone()[0]


def main():
    clear_database()
    clear_app_queue()
    driver = create_driver()
    wait = WebDriverWait(driver, 10)

    try:
        for number in range(1, TOTAL_RECORDS + 1):
            record = {
                "fullName": fake.name(),
                "phone": fake.phone_number()[:50],
                "email": fake.email()[:254],
                "message": fake.paragraph(nb_sentences=2),
            }
            fill_form(driver, wait, record)
            if number % 10 == 0:
                print(f"Через форму отправлено заявок: {number}")

        transfer_records(driver, wait)
    except TimeoutException as error:
        raise RuntimeError("Selenium не дождался ответа приложения.") from error
    finally:
        driver.quit()

    total = count_records()
    print(f"В PostgreSQL найдено записей: {total}")

    if total != TOTAL_RECORDS:
        raise RuntimeError(
            f"Ожидалось {TOTAL_RECORDS} записей, получено {total}."
        )

    print("Пользовательский сценарий успешно пройден.")


if __name__ == "__main__":
    main()
