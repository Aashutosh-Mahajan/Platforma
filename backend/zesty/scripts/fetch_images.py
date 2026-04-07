import json
import os

import requests


def fetch_pexels_image(cuisine: str, index: int) -> str:
	"""Return a medium-size Pexels image URL for a cuisine search query.

	The Pexels API does not provide an explicit offset parameter for search,
	so this uses `page=index+1` with `per_page=1` to simulate offset behavior.
	"""
	api_key = os.environ.get("PEXELS_API_KEY", "").strip()
	if not api_key:
		return ""

	page = max(index, 0) + 1
	params = {
		"query": f"{cuisine} restaurant food Mumbai",
		"per_page": 1,
		"page": page,
	}

	try:
		response = requests.get(
			"https://api.pexels.com/v1/search",
			params=params,
			headers={"Authorization": api_key},
			timeout=20,
		)
		response.raise_for_status()
		payload = response.json()
	except Exception:
		return ""

	photos = payload.get("photos") or []
	if not photos:
		return ""

	src = photos[0].get("src") or {}
	return src.get("medium", "")
