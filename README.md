# PhishIntel

A browser explorer for Canadian phishing research. Open [PhishIntel](https://coolcode.ca/phishintel/) or build the project locally.

<!-- coolcode:guide -->
Compare cumulative outcomes in the Cyber Centre’s study of phishing against cloud sign-ins, then search official Canadian publications by topic, publisher or evidence type. Download the study table or filtered citations as CSV. Each research question points back to the publication that leaves it open.
<!-- /coolcode:guide -->

## Coverage

[The indexed publications](web/data/advisories.json) are an editorial selection of official Canadian sources. Each row describes a publication and carries its date basis. Multiple publications can cover the same activity. The index is a manually reviewed snapshot. Search terms and filters use the URL fragment so a view can be bookmarked and shared. They are processed locally. The site uses CoolCode’s standard visit counter. Opening an external publication visits its publisher.

[The outcome series](web/data/outcomes.json) transcribes the long description for Figure 7 of the Canadian Centre for Cyber Security’s ITSM.30.031. Values are cumulative percentages for its studied federal and critical infrastructure partner population, through each quarter from Q1 2023 to Q2 2025. The source rounds its figures, and some totals differ slightly from 100%. Published percentages cannot determine exact counts or national prevalence. The labels in the CSV expand the two blocking categories.

## Update

When the Cyber Centre releases a comparable figure, check its reporting population, cumulative basis and category definitions before extending the series. Index new publications by their official HTTPS permalink, date as labelled, publisher, type, topics and a brief independently written synopsis. Adjust the review date after checking sources. Data files ship with the app and the build works offline.

## Develop

Run `node --test tests/*.test.mjs`, `python3 -m unittest discover -s tests -v`, then `python3 scripts/build.py`. To run the browser checks, install the dependencies in `tests/browser-requirements.txt` and Playwright Chromium, then run `python3 tests/browser_smoke.py`. Serve `dist/` over HTTP for a local preview. The existing GitHub Actions workflow verifies and publishes builds from main.
