# ruff: noqa: E402
import os
import sys
import json
from typing import List, Dict, Any

# Add current directory and shared module directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)
root_dir = os.path.abspath(os.path.join(current_dir, "../.."))
sys.path.insert(0, root_dir)

from agent import Agent

# Simple dataset representation
DEFAULT_DATASET = [
    {
        "id": 1,
        "input": "Explain what Google Cloud Run does in one sentence.",
        "expected_keywords": ["serverless", "container", "run", "deploy"],
    },
    {
        "id": 2,
        "input": "List three core databases on Google Cloud.",
        "expected_keywords": ["AlloyDB", "Spanner", "BigQuery", "Cloud SQL", "Firestore"],
    },
]


import asyncio


async def run_evaluation(dataset: List[Dict[str, Any]]) -> Dict[str, Any]:
    print(f"Starting local evaluation on {len(dataset)} examples...")
    agent = Agent()
    agent.set_up()

    results = []
    total_score = 0

    for item in dataset:
        prompt_val = item.get("prompt") or item.get("input")
        if isinstance(prompt_val, dict) and "parts" in prompt_val:
            prompt = prompt_val["parts"][0].get("text", "")
        else:
            prompt = str(prompt_val)
        case_id = item.get("eval_case_id") or item.get("id")
        print(f"\nEvaluating Case {case_id}: '{prompt}'")

        # Invoke agent
        response_text = await agent.query_async(prompt)
        print(f"Agent Response: {response_text.strip()}")

        # Score based on simple keyword matches (heuristic)
        matches = [kw for kw in item["expected_keywords"] if kw.lower() in response_text.lower()]
        score = len(matches) / len(item["expected_keywords"])
        total_score += score

        results.append(
            {
                "id": item["id"],
                "prompt": prompt,
                "response": response_text,
                "matched_keywords": matches,
                "score": score,
            }
        )

    average_score = total_score / len(dataset)
    summary = {"dataset_size": len(dataset), "average_score": average_score, "results": results}
    return summary


if __name__ == "__main__":
    dataset_path = os.path.join(current_dir, "tests/eval/datasets/basic-dataset.json")
    dataset = DEFAULT_DATASET

    if os.path.exists(dataset_path):
        try:
            with open(dataset_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict) and "eval_cases" in data:
                    dataset = data["eval_cases"]
                else:
                    dataset = data
                print(f"Loaded evaluation dataset from: {dataset_path}")
        except Exception as e:
            print(f"Warning: Failed to load {dataset_path}, using fallback: {e}")

    summary = asyncio.run(run_evaluation(dataset))
    print("\n" + "=" * 40)
    print("EVALUATION SUMMARY")
    print(f"Average Score: {summary['average_score']:.2%}")
    print("=" * 40)

    # Save output to a report file
    report_path = os.path.join(current_dir, "eval_report.json")
    with open(report_path, "w") as f:
        json.dump(summary, f, indent=2)
    print(f"Evaluation report saved to: {report_path}")
