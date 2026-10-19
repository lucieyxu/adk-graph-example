# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Live Vertex AI checks for the intent classifier behind route_user_request.

Every other test mocks classify_intent_async, so these are the only tests that prove the
configured model accepts the classifier's request config (thinking level, response schema).
"""

import pytest
from dotenv import load_dotenv

from company_health_analyst.nodes import classify_intent_async
from company_health_analyst.schemas import IntentCategory

load_dotenv()


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("query", "expected"),
    [
        ("Compare this new report to past reports", IntentCategory.ASK_EXPLANATION),
        ("Change the parameter to use Asia", IntentCategory.MODIFY),
        ("Also change the time span to 2025", IntentCategory.MODIFY),
        ("all good", IntentCategory.CONFIRM_REPORT),
    ],
)
async def test_classify_intent_live_on_post_report_demo_turns(
    query: str, expected: IntentCategory
) -> None:
    """Verifies README turns 7-10 are classified correctly by the configured model.

    A rejected request config raises errors.APIError here instead of being absorbed by
    route_user_request's fallback to explanation_agent.
    """
    assert await classify_intent_async(query) == expected
