import os
import subprocess

screens = [
    {
        "id": "179c5ace07e34a1f9ca89de3579a0474",
        "name": "Event Details and Booking",
        "screenshot": "https://lh3.googleusercontent.com/aida/ADBb0uh49yy4bsZWKj5VuNufShPrsshaja6hp-PHsHVCVGtczbYZMP1GUDM1jpDYyuLUCr6fVTtzZhyyXgD7OSY2vEWpaTCN4O73c7HN8FK2s4m5YAPnJocRfh8vTm7jXyngWB8Kl6zXf4KJgbCUITi9TeBObnJbknvvLnErbunV2QKSK5j_If-5Kd8BodK-Lsx2GZxuh8hZ3MNn8FuBQrC-_oV39bCKBoee6vzEGXC_nnmWvKbPMPB3fIRd",
        "html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ6Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpZCiVodG1sXzIyODgzYmI3ZjgxOTQzOTA4ZDFhN2Q3ZDZiOGY0YzIwEgsSBxD_6syT2QMYAZIBIgoKcHJvamVjdF9pZBIUQhI1ODM3Nzc2NDg4ODkxOTQ2NjM&filename=&opi=89354086"
    },
    {
        "id": "02adc495e0db4c328e799d670bbb66e3",
        "name": "Checkout and Transaction",
        "screenshot": "https://lh3.googleusercontent.com/aida/ADBb0ugEP5yCfTdFrb2BU2VVnsYo9_AyUPrbgG70R3SfxzH6-YuS8AhEbgx7vH_TUvzJXumpv1R6ESPKJX6FwvNVo4Iac9HqQTOrkWTsQortEgIL7nE1NlhINmG7zamy6kBT1rtRgSTROdcssAsojkgVPVCrLnRNb2T-5vjjCaZuHuefkalHMNg5W_pbs00_K3vdXwlPePAiMZ0Fi2FUvVTmpuG6CdUtBH5g4SX2w6vdb6TzVosy6j5c9J5jcQ",
        "html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ6Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpZCiVodG1sXzYwYTdmYjM2N2I5ZDQxMDJhMWI0OWE1YmE3ZjY0MGNlEgsSBxD_6syT2QMYAZIBIgoKcHJvamVjdF9pZBIUQhI1ODM3Nzc2NDg4ODkxOTQ2NjM&filename=&opi=89354086"
    },
	{
		"id": "0d448dddb3814599b37c397566d37755",
		"name": "Concert Seat Selection",
		"screenshot": "https://lh3.googleusercontent.com/aida/ADBb0ujjWi-ktGdtN2DeG7ykpXfIx5_tgls5wXONjC9gkpz4TwQGv7C4NdppQwg0EYQGJcA4JHkLIkr94PXSLk7_X0faCPcIV6hkY6gHk_agf6kAko9c_wInlZXjXBtDzLTcUpgxueT1uvlYgKBl0ENZJt6Cj_VHlJc3XBrRfx1AukJf4n6v8a0XB5cGDWEI6QcjlqTu1HMkJdcFOUKD2WI3JYrSNno99WqHAckQMqTqIO1hQr-y66nApFg1_w",
		"html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ6Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpZCiVodG1sXzgzYTdmNjczNDM0MTRiOWFhYTRhM2NhMjRmNTg3OWY4EgsSBxD_6syT2QMYAZIBIgoKcHJvamVjdF9pZBIUQhI1ODM3Nzc2NDg4ODkxOTQ2NjM&filename=&opi=89354086"
	},
	{
		"id": "53fd5e663381452098ac4fb96906c7b7",
		"name": "Cinema Seat Selection",
		"screenshot": "https://lh3.googleusercontent.com/aida/ADBb0ugMu7y-bL5p_7oNuBEQvXsNecQXsxsmNuy1jidV1YLptEWZLdWVOf58PnHNyDrC6t9ojzlqoVXkFCW9J1gkpb6VC7TEFW2Ri5Xyn4HP2UkE3iR1WObYga92XRNPepm-RJdqwST79t-tYm5o0XxrISfG63z2o2M6m4Jx5G3asaCewryT4sEfphufwYukok7vQAXrpR7bqyZS_XkizqHtZsnDns2qzg2ypim8afYY8tuTsbxyFTMU1jwxlA",
		"html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ6Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpZCiVodG1sX2U0ZDY1MzljMDQ3NjQ4OGQ4N2IxZjEyYjA4ZDM5YjIzEgsSBxD_6syT2QMYAZIBIgoKcHJvamVjdF9pZBIUQhI1ODM3Nzc2NDg4ODkxOTQ2NjM&filename=&opi=89354086"
	},
	{
		"id": "84fac3a796cd4b2aa8a332bc7c81dab6",
		"name": "Enhanced Stadium Map Selection",
		"screenshot": "https://lh3.googleusercontent.com/aida/ADBb0uiMC-gxiR-55Zx-k5bY5EdQAOjEmv4bOHEHbycUt1-aohpuDNzuPjGnrwhL0inuCINyS8M9WvgMkQrzHZ063XoZqw76MmzkQ6sbrIM-_SVX01VeZfjmqSoFbrtI-rCTobKuFo3L_SeWG1tBdmVxmFwa9C5iTYI6C1jg5r8KMwlEFfWwg33taNQxGG8D2yPn-BMBhp8V4-So2RnqdWyOlxCQJdAWwuQJNXAJAwLD9lqCr9NgGyPykZKF",
		"html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ6Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpZCiVodG1sXzA1ODA5NTliMzMzZDQ2OWNiNDYwNTA3ODMzNmE1NGE1EgsSBxD_6syT2QMYAZIBIgoKcHJvamVjdF9pZBIUQhI1ODM3Nzc2NDg4ODkxOTQ2NjM&filename=&opi=89354086"
	},
	{
		"id": "8c5faea4d56146b9aa8af81d52cc0e76",
		"name": "Eventra Landing Page",
		"screenshot": "https://lh3.googleusercontent.com/aida/ADBb0ujbcQpop7w6PHirWRf2PbMDraMYdVpMyTpsgDA2jZmbHDGBvwdB9y2ZGEbSts0AZXSG-D7cRb4vLZowWvGFFDAhTEb71INntkp4oAcI76-UmpUO7PrfG2Z9tDjkDskCvrINbEpfLu3DSglcCOTonNtVyUT9MpnmiAwZFEMW0Uot6JjhA9NpWl1R94z2uGOS-DS4gV19GATtZNDADer-qTNdcIHu_0UKe0QmQFpn-bKfVrpieUafJFAyvQ",
		"html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ6Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpZCiVodG1sXzQ1ZmZmNDRlYjYxZjQ0ZTc4M2E5M2ZlM2IzMzFlMmUyEgsSBxD_6syT2QMYAZIBIgoKcHJvamVjdF9pZBIUQhI1ODM3Nzc2NDg4ODkxOTQ2NjM&filename=&opi=89354086"
	},
	{
		"id": "946f24c897084a808f0db1b535ba02f6",
		"name": "Enhanced Concert Map Selection",
		"screenshot": "https://lh3.googleusercontent.com/aida/ADBb0ugBEVHhaAKryUtJKTw5lNzN34r0NNhma0o3KKIXemppAArr6bl9qtjvsOwK6WikNfHX9zMtxMYB4zOW_kOW-9csbnbYbrX_x-L6J_RZDTDNT4YfLN0g1fUQmpIPnfHocpTr0veBeoh5-_0qSeGhcgM93vtWlStnuy8QTnW3BJxKOlM3XEcaxjU_Da0kll9ZMvjQRsgwugqKY1cEz7o5WYlfsfc5D4aD1qqJDeEC9Nc-7jLnqA52VlDL1w",
		"html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ6Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpZCiVodG1sXzI2MGE1N2E4ZDhkNDRhZWU5ZTcwM2VkOGZjMDM3ZTVhEgsSBxD_6syT2QMYAZIBIgoKcHJvamVjdF9pZBIUQhI1ODM3Nzc2NDg4ODkxOTQ2NjM&filename=&opi=89354086"
	},
	{
		"id": "9994f663f96d4d4f9eee2922562577e1",
		"name": "Enhanced Cinema Seat Map",
		"screenshot": "https://lh3.googleusercontent.com/aida/ADBb0ujTHY9pDuMQbxOBLLBwcgcF4AN0CJHkcnMjh8scMy6bOsSm-VPGFaI4p4nABfaGaU-eCiRcpggtpuj4lAMgIunqWF9FCg_hIzG2aDnsZ3XbbZgFEoiIO3S_IGC3gmtN9T6C4N0-lJsUJPRhOtB4SknL9Js20755-8fpXhDpTqLoQ368uH_rMxGCywyUUbErnyIPa-lBM9hVg13f3uIHhbUe1Jaasl18lH2tUTyIgO1Pr3V8OGFWRwePsg",
		"html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ6Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpZCiVodG1sX2M4MDA0NTY1ZWQ5MDQ2YzA4M2MxMjJjMWNhZGI1YzJiEgsSBxD_6syT2QMYAZIBIgoKcHJvamVjdF9pZBIUQhI1ODM3Nzc2NDg4ODkxOTQ2NjM&filename=&opi=89354086"
	},
	{
		"id": "c874e7ce191047b89f16eeb304647d7f",
		"name": "Stadium Seat Selection",
		"screenshot": "https://lh3.googleusercontent.com/aida/ADBb0ui07VTOjc0Eo7dUhmoJJeq3LXT-S_RwWlY6OGQRZP8Yk1ZVWaFXU1ojr2beEmO3o8KQoF-U0SJBNRcONXru1aIj1hTUJAcLaopqlzCHUDDeFJLN5spubOa6DNSjhrkhIgN0pf5glvPRxptMns1yO4GtHoL2ZhVJOmTcSHi68I7UDsQ-vgv2U7bgB4EuNkEyPpJVj577mVZUKN4dSPD_kmPtn7zRfijEdqut16RfWQ_QAn-gC1BUhXm0-g",
		"html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ6Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpZCiVodG1sXzI2ZTJkNDNkZjIwYjRkNDU5NzgyOTg0MTQxNTQxMWY3EgsSBxD_6syT2QMYAZIBIgoKcHJvamVjdF9pZBIUQhI1ODM3Nzc2NDg4ODkxOTQ2NjM&filename=&opi=89354086"
	}
]

os.makedirs('Stitch_Screens', exist_ok=True)

for s in screens:
    name_clean = s['name'].replace(' ', '_').replace('&', 'and')
    html_file = os.path.join('Stitch_Screens', f"{name_clean}.html")
    img_file = os.path.join('Stitch_Screens', f"{name_clean}.png")
    
    print(f"Downloading {name_clean}...")
    subprocess.run(['curl', '-L', '-s', '-A', 'Mozilla/5.0', '-o', html_file, s['html']])
    subprocess.run(['curl', '-L', '-s', '-A', 'Mozilla/5.0', '-o', img_file, s['screenshot']])

print("Done downloading screens.")
