#!/usr/bin/env python3
"""Scrape LiU programme curriculum and course detail pages with Selenium.

Usage:
  python3 scripts/scrape_liu_program_courses.py \
    --program-url "https://studieinfo.liu.se/en/program/6MICS#curriculum" \
    --output data/liu_6mics_courses.json
"""

from __future__ import annotations

import argparse
import json
import re
import time
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup, NavigableString, Tag
from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait


DEFAULT_PROGRAM_URL = "https://studieinfo.liu.se/en/program/6MICS#curriculum"
DEFAULT_OUTPUT = "data/liu_6mics_courses.json"


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def parse_float(raw: str) -> Optional[float]:
    match = re.search(r"(\d+(?:[.,]\d+)?)", raw or "")
    if not match:
        return None
    return float(match.group(1).replace(",", "."))


def parse_list_values(raw: str) -> List[str]:
    if not raw:
        return []
    return [clean_text(part) for part in raw.split(",") if clean_text(part)]


def normalize_heading(text: str) -> str:
    return clean_text(text).lower()


def node_text(node: Any) -> str:
    if isinstance(node, NavigableString):
        return clean_text(str(node))
    if isinstance(node, Tag):
        return clean_text(node.get_text(" ", strip=True))
    return ""


def extract_heading_block(container: Optional[Tag], heading: str) -> str:
    if not container:
        return ""
    target = normalize_heading(heading)
    for tag in container.find_all(["h2", "h3"]):
        if normalize_heading(tag.get_text(" ", strip=True)) != target:
            continue
        chunks: List[str] = []
        for sibling in tag.next_siblings:
            if isinstance(sibling, Tag) and sibling.name in {"h2", "h3"}:
                break
            text = node_text(sibling)
            if text:
                chunks.append(text)
        return clean_text(" ".join(chunks))
    return ""


def extract_overview_labels(soup: BeautifulSoup) -> Dict[str, str]:
    container = soup.select_one("#overview .overview-content")
    if not container:
        return {}

    result: Dict[str, str] = {}
    for label in container.select("h2.overview-label"):
        key = clean_text(label.get_text(" ", strip=True))
        values: List[str] = []
        for sibling in label.next_siblings:
            if isinstance(sibling, Tag) and sibling.name == "h2" and "overview-label" in sibling.get("class", []):
                break
            text = node_text(sibling)
            if text:
                values.append(text)
        result[key] = clean_text(" ".join(values))
    return result


def extract_sidebar_info(soup: BeautifulSoup) -> Dict[str, str]:
    result: Dict[str, str] = {}
    for paragraph in soup.select(".aside-block p"):
        label = paragraph.select_one("span.text-label")
        if not label:
            continue
        key = clean_text(label.get_text(" ", strip=True))
        label.extract()
        value = clean_text(paragraph.get_text(" ", strip=True))
        if key:
            result[key] = value
    return result


def extract_course_offered_rows(soup: BeautifulSoup) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    table = soup.select_one("#overview table.study-guide-table")
    if not table:
        return rows
    for tr in table.select("tr"):
        tds = tr.find_all("td")
        if len(tds) < 8:
            continue
        programme_code = clean_text(tds[0].get_text(" ", strip=True))
        programme_name = clean_text(tds[1].get_text(" ", strip=True))
        programme_link = tds[1].find("a")
        rows.append(
            {
                "programme_code": programme_code,
                "programme_name": programme_name,
                "programme_url": urljoin("https://studieinfo.liu.se", programme_link["href"])
                if programme_link and programme_link.has_attr("href")
                else None,
                "semester": clean_text(tds[2].get_text(" ", strip=True)),
                "period": clean_text(tds[3].get_text(" ", strip=True)),
                "time_module": clean_text(tds[4].get_text(" ", strip=True)),
                "language": clean_text(tds[5].get_text(" ", strip=True)),
                "campus": clean_text(tds[6].get_text(" ", strip=True)),
                "ecv": clean_text(tds[7].get_text(" ", strip=True)),
                "ecv_label": clean_text(tds[7].find("span").get("title", ""))
                if tds[7].find("span")
                else "",
            }
        )
    return rows


def parse_semester_title(title: str) -> Dict[str, Any]:
    value = clean_text(title)
    parsed: Dict[str, Any] = {
        "semester": value,
        "semester_number": None,
        "semester_term": None,
        "semester_year": None,
    }
    match = re.search(r"Semester\s+(\d+)\s+([A-Za-z]+)\s+(\d{4})", value, flags=re.IGNORECASE)
    if match:
        parsed["semester_number"] = int(match.group(1))
        parsed["semester_term"] = match.group(2)
        parsed["semester_year"] = int(match.group(3))
    return parsed


def build_driver(headed: bool) -> webdriver.Chrome:
    options = ChromeOptions()
    if not headed:
        options.add_argument("--headless=new")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--window-size=1920,2000")
    return webdriver.Chrome(options=options)


def open_curriculum_tab(driver: webdriver.Chrome, wait: WebDriverWait) -> None:
    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "button[data-bs-target='#curriculum']")))
    try:
        tab_button = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-bs-target='#curriculum']")))
        driver.execute_script("arguments[0].click();", tab_button)
    except TimeoutException:
        pass
    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "#curriculum")))


def extract_curriculum_offerings(program_soup: BeautifulSoup, base_url: str) -> List[Dict[str, Any]]:
    offerings: List[Dict[str, Any]] = []
    curriculum = program_soup.select_one("#curriculum")
    if not curriculum:
        return offerings

    for semester_section in curriculum.select("section.accordion.semester"):
        semester_title_tag = semester_section.select_one("h3")
        semester_info = parse_semester_title(semester_title_tag.get_text(" ", strip=True) if semester_title_tag else "")

        for spec_section in semester_section.select("div.specialization"):
            specialization_code = clean_text(spec_section.get("data-specialization", "")) or None
            caption = spec_section.select_one("table caption span")
            specialization_label = clean_text(caption.get_text(" ", strip=True)) if caption else ""
            specialization_name = specialization_label.replace("Specialisation:", "").strip() if specialization_label else ""
            specialization_name = specialization_name or None

            for period_body in spec_section.select("tbody.period"):
                period_header = period_body.select_one("tr > th[colspan]")
                period_name = clean_text(period_header.get_text(" ", strip=True)) if period_header else ""

                details_by_row_id: Dict[str, List[str]] = {}
                for detail_row in period_body.select("tr.details-row"):
                    row_id = clean_text(detail_row.get("data-id", ""))
                    detail_entries = [
                        clean_text(detail.get_text(" ", strip=True))
                        for detail in detail_row.select("div.details-entry")
                        if clean_text(detail.get_text(" ", strip=True))
                    ]
                    if row_id and detail_entries:
                        details_by_row_id[row_id] = detail_entries

                for main_row in period_body.select("tr.main-row"):
                    cells = main_row.find_all("td", recursive=False)
                    if len(cells) < 6:
                        continue

                    course_code = clean_text(cells[0].get_text(" ", strip=True))
                    course_name_cell = cells[1]
                    course_name = clean_text(course_name_cell.get_text(" ", strip=True))
                    course_link_tag = course_name_cell.find("a")
                    course_url = (
                        urljoin(base_url, course_link_tag["href"])
                        if course_link_tag and course_link_tag.has_attr("href")
                        else None
                    )

                    curriculum_credits_raw = clean_text(cells[2].get_text(" ", strip=True))
                    level = clean_text(cells[3].get_text(" ", strip=True))
                    time_module_raw = clean_text(cells[4].get_text(" ", strip=True))
                    ecv_raw = clean_text(cells[5].get_text(" ", strip=True)).upper()
                    ecv_span = cells[5].find("span")
                    ecv_label = clean_text(ecv_span.get("title", "")) if ecv_span else ""

                    row_id = clean_text(main_row.get("data-id", ""))
                    offering = {
                        "course_code": course_code,
                        "name": course_name,
                        "description": "",
                        "credits": parse_float(curriculum_credits_raw),
                        "credits_display": curriculum_credits_raw,
                        "ECV": ecv_raw,
                        "ecv_code": ecv_raw,
                        "ecv_label": ecv_label,
                        "level": level,
                        "Time module": time_module_raw,
                        "time_module": time_module_raw,
                        "time_module_values": parse_list_values(time_module_raw),
                        "Period": period_name,
                        "period": period_name,
                        "semester": semester_info["semester"],
                        "semester_number": semester_info["semester_number"],
                        "semester_term": semester_info["semester_term"],
                        "semester_year": semester_info["semester_year"],
                        "specialisation": specialization_name,
                        "specialisation_code": specialization_code,
                        "curriculum_notes": details_by_row_id.get(row_id, []),
                        "detail_url": course_url,
                        "row_meta": {
                            "row_id": row_id or None,
                            "data_vof": clean_text(main_row.get("data-vof", "")) or None,
                            "data_field_of_study": clean_text(main_row.get("data-field-of-study", "")) or None,
                        },
                    }
                    offerings.append(offering)
    return offerings


def scrape_course_detail(driver: webdriver.Chrome, url: str, wait_seconds: int) -> Dict[str, Any]:
    wait = WebDriverWait(driver, wait_seconds)
    driver.get(url)
    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "h1")))
    soup = BeautifulSoup(driver.page_source, "html.parser")

    title = clean_text(soup.select_one("h1").get_text(" ", strip=True)) if soup.select_one("h1") else ""
    title_match = re.match(r"^(.*?),\s*([\d.,]+)\s*credits?$", title, flags=re.IGNORECASE)
    title_name = clean_text(title_match.group(1)) if title_match else title
    title_credits = parse_float(title_match.group(2)) if title_match else None

    syllabus_container = soup.select_one("#syllabus .syllabus")
    overview_labels = extract_overview_labels(soup)
    sidebar = extract_sidebar_info(soup)
    offered_rows = extract_course_offered_rows(soup)

    intended_learning_outcomes = extract_heading_block(syllabus_container, "Intended learning outcomes")
    course_content = extract_heading_block(syllabus_container, "Course content")

    description = intended_learning_outcomes or course_content

    return {
        "detail_url": url,
        "title": title,
        "name": title_name,
        "credits": title_credits,
        "description": description,
        "main_field_of_study": extract_heading_block(syllabus_container, "Main field of study")
        or overview_labels.get("Main field of study", ""),
        "course_level": extract_heading_block(syllabus_container, "Course level")
        or overview_labels.get("Course level", ""),
        "advancement_level": extract_heading_block(syllabus_container, "Advancement level"),
        "course_type": sidebar.get("Course type", "") or overview_labels.get("Course type", ""),
        "examiner": overview_labels.get("Examiner", ""),
        "director_of_studies": overview_labels.get("Director of studies or equivalent", ""),
        "education_components": overview_labels.get("Education components", ""),
        "prerequisites": extract_heading_block(syllabus_container, "Prerequisites"),
        "course_offered_for": extract_heading_block(syllabus_container, "Course offered for"),
        "specific_information": extract_heading_block(syllabus_container, "Specific information"),
        "intended_learning_outcomes": intended_learning_outcomes,
        "course_content": course_content,
        "teaching_and_working_methods": extract_heading_block(syllabus_container, "Teaching and working methods"),
        "examination": extract_heading_block(syllabus_container, "Examination"),
        "grades": extract_heading_block(syllabus_container, "Grades"),
        "other_information": extract_heading_block(syllabus_container, "Other information"),
        "department": extract_heading_block(syllabus_container, "Department"),
        "language_campus_ecv_rows": offered_rows,
        "syllabus_metadata": {
            "course_code": sidebar.get("Course code", ""),
            "faculty": sidebar.get("Faculty", ""),
            "valid_from": sidebar.get("Valid from", ""),
            "determined_by": sidebar.get("Determined by", ""),
            "date_determined": sidebar.get("Date determined", ""),
            "registration_number": sidebar.get("Registration number", ""),
        },
    }


def build_courses_aggregate(
    offerings: Iterable[Dict[str, Any]], details_by_code: Dict[str, Dict[str, Any]]
) -> List[Dict[str, Any]]:
    grouped: Dict[str, Dict[str, Any]] = {}

    for offering in offerings:
        code = offering["course_code"]
        if code not in grouped:
            detail = details_by_code.get(code, {})
            grouped[code] = {
                "course_code": code,
                "name": detail.get("name") or offering.get("name", ""),
                "description": detail.get("description", "") or offering.get("description", ""),
                "credits": detail.get("credits") if detail.get("credits") is not None else offering.get("credits"),
                "levels": [],
                "specialisations": [],
                "periods": [],
                "semesters": [],
                "time_modules": [],
                "ecv_values": [],
                "ecv_by_specialisation": defaultdict(set),
                "curriculum_notes": set(),
                "detail": detail,
                "offerings": [],
            }

        entry = grouped[code]
        level = offering.get("level")
        if level and level not in entry["levels"]:
            entry["levels"].append(level)

        spec = offering.get("specialisation")
        if spec and spec not in entry["specialisations"]:
            entry["specialisations"].append(spec)

        period = offering.get("period")
        if period and period not in entry["periods"]:
            entry["periods"].append(period)

        semester = offering.get("semester")
        if semester and semester not in entry["semesters"]:
            entry["semesters"].append(semester)

        time_module = offering.get("time_module")
        if time_module and time_module not in entry["time_modules"]:
            entry["time_modules"].append(time_module)

        ecv_code = offering.get("ecv_code")
        if ecv_code and ecv_code not in entry["ecv_values"]:
            entry["ecv_values"].append(ecv_code)

        spec_key = spec or "__general__"
        if ecv_code:
            entry["ecv_by_specialisation"][spec_key].add(ecv_code)

        for note in offering.get("curriculum_notes", []):
            if note:
                entry["curriculum_notes"].add(note)

        entry["offerings"].append(offering)

    result: List[Dict[str, Any]] = []
    for code in sorted(grouped.keys()):
        item = grouped[code]
        item["ecv_by_specialisation"] = {
            key: sorted(values) for key, values in item["ecv_by_specialisation"].items()
        }
        item["curriculum_notes"] = sorted(item["curriculum_notes"])
        result.append(item)
    return result


def enrich_offerings(offerings: List[Dict[str, Any]], details_by_code: Dict[str, Dict[str, Any]]) -> None:
    for offering in offerings:
        detail = details_by_code.get(offering["course_code"], {})
        if not detail:
            continue
        if not offering.get("description"):
            offering["description"] = detail.get("description", "")
        if offering.get("credits") is None and detail.get("credits") is not None:
            offering["credits"] = detail["credits"]
        if detail.get("detail_url"):
            offering["detail_url"] = detail["detail_url"]


def ordered_unique_course_targets(offerings: Iterable[Dict[str, Any]]) -> List[Tuple[str, str]]:
    targets: List[Tuple[str, str]] = []
    seen_codes = set()
    for offering in offerings:
        code = offering.get("course_code")
        url = offering.get("detail_url")
        if not code or not url or code in seen_codes:
            continue
        seen_codes.add(code)
        targets.append((code, url))
    return targets


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Scrape LiU programme curriculum and course details.")
    parser.add_argument("--program-url", default=DEFAULT_PROGRAM_URL, help="Programme page URL")
    parser.add_argument("--output", default=DEFAULT_OUTPUT, help="Output JSON path")
    parser.add_argument("--max-courses", type=int, default=0, help="Only fetch detail pages for first N unique courses")
    parser.add_argument("--wait-seconds", type=int, default=30, help="Selenium wait timeout in seconds")
    parser.add_argument("--headed", action="store_true", help="Run Chrome in headed mode")
    parser.add_argument("--sleep-between", type=float, default=0.1, help="Sleep seconds between course page requests")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    parsed_url = urlparse(args.program_url)
    base_url = f"{parsed_url.scheme}://{parsed_url.netloc}"

    crawl_started = datetime.now(timezone.utc)
    driver = build_driver(headed=args.headed)

    try:
        wait = WebDriverWait(driver, args.wait_seconds)
        driver.get(args.program_url)
        open_curriculum_tab(driver, wait)
        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "#curriculum tr.main-row")))
        resolved_program_url = driver.current_url

        program_soup = BeautifulSoup(driver.page_source, "html.parser")
        offerings = extract_curriculum_offerings(program_soup, base_url)
        if not offerings:
            raise RuntimeError("No curriculum offerings were parsed from the programme page.")

        course_targets = ordered_unique_course_targets(offerings)
        if args.max_courses > 0:
            course_targets = course_targets[: args.max_courses]

        details_by_code: Dict[str, Dict[str, Any]] = {}
        for idx, (course_code, detail_url) in enumerate(course_targets, start=1):
            last_error: Optional[Exception] = None
            for _attempt in range(2):
                try:
                    details_by_code[course_code] = scrape_course_detail(driver, detail_url, args.wait_seconds)
                    print(f"[{idx}/{len(course_targets)}] scraped {course_code} {detail_url}")
                    last_error = None
                    break
                except Exception as exc:  # pylint: disable=broad-except
                    last_error = exc
                    time.sleep(0.2)
            if last_error is not None:
                print(f"[{idx}/{len(course_targets)}] failed {course_code} {detail_url}: {last_error}")
            if args.sleep_between > 0:
                time.sleep(args.sleep_between)

        enrich_offerings(offerings, details_by_code)
        courses = build_courses_aggregate(offerings, details_by_code)

        crawl_finished = datetime.now(timezone.utc)
        output_payload = {
            "meta": {
                "source_program_url": args.program_url,
                "source_program_url_resolved": resolved_program_url,
                "programme_title": clean_text(program_soup.select_one("h1").get_text(" ", strip=True))
                if program_soup.select_one("h1")
                else "",
                "crawled_at_utc": crawl_finished.isoformat(),
                "crawl_duration_seconds": round((crawl_finished - crawl_started).total_seconds(), 3),
                "total_offerings": len(offerings),
                "total_courses": len(courses),
                "detail_pages_attempted": len(course_targets),
                "detail_pages_succeeded": len(details_by_code),
            },
            "schema_notes": {
                "offering_definition": "One row in curriculum for a course in a specific semester/period/specialisation context.",
                "ecv_variation_strategy": "Use course.ecv_by_specialisation and keep raw offering rows for accurate context-specific ECV.",
            },
            "offerings": offerings,
            "courses": courses,
        }

        output_path.write_text(json.dumps(output_payload, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"Wrote {output_path} with {len(courses)} courses and {len(offerings)} offerings.")
    finally:
        driver.quit()


if __name__ == "__main__":
    main()
