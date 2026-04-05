import os

pages_dir = 'frontend/zesty-app/src/pages/eventra'

def inject_navigate(filename, target_route, button_match_texts):
    filepath = os.path.join(pages_dir, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    if "from 'react-router-dom'" not in content:
        content = content.replace("import React from 'react';", "import React from 'react';\nimport { useNavigate } from 'react-router-dom';")
    
    # Inject useNavigate
    func_def = f"const {filename.split('.')[0]} = () => {{"
    if "const navigate = useNavigate();" not in content:
        content = content.replace(func_def, f"{func_def}\n  const navigate = useNavigate();")
    
    # Replace buttons
    for txt in button_match_texts:
        # Find exactly the <button class="...">txt</button> or similar by replacing just the opening tag nearby or doing a simple replace if we know it
        pass

    # Actually simpler: replace <button 
    # to <button onClick={() => navigate('...')}
    # BUT we only want it on the Proceed/Confirm button.
    # Let's just find the text "Confirm" or "Proceed" or "Checkout"
    
    import re
    
    def replacer(m):
        btn = m.group(0)
        if "onClick=" not in btn:
            return btn.replace('<button', f'<button onClick={{() => navigate("{target_route}")}}')
        return btn

    # We use regex to find buttons that contain checkout/proceed texts
    content = re.sub(r'<button[^>]*>.*?Confirm.*?</button>', replacer, content, flags=re.DOTALL)
    content = re.sub(r'<button[^>]*>.*?Proceed.*?</button>', replacer, content, flags=re.DOTALL)
    content = re.sub(r'<button[^>]*>.*?Checkout.*?</button>', replacer, content, flags=re.DOTALL)
    content = re.sub(r'<button[^>]*>.*?Pay.*?</button>', replacer, content, flags=re.DOTALL)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Injected routing to {filename}")

# Inject into seat selection maps to go to checkout
inject_navigate('EnhancedCinemaSeatMap.jsx', '/eventra/checkout', [])
inject_navigate('EnhancedConcertMapSelection.jsx', '/eventra/checkout', [])
inject_navigate('StadiumSeatSelection.jsx', '/eventra/checkout', [])
inject_navigate('CinemaSeatSelection.jsx', '/eventra/checkout', [])
inject_navigate('ConcertSeatSelection.jsx', '/eventra/checkout', [])


# Update Landing Page to diverge to multiple maps instead of just event/1
f1 = os.path.join(pages_dir, 'EventraLandingPage.jsx')
with open(f1, 'r', encoding='utf-8') as f:
    c1 = f.read()

# I previously added <Link to="/eventra/events/1"><button ...
# I will change some of them to point directly to diverse seat pages for demonstration purposes so ALL components are accessible without building out a massive database.
import re
# Find all Link to="/eventra/events/1"
links = list(re.finditer(r'<Link to="/eventra/events/1">', c1))

if len(links) >= 5:
    # First link -> cinema enhanced
    c1 = c1[:links[0].start()] + '<Link to="/eventra/seats/cinema-enhanced">' + c1[links[0].end():]
    
# We will just do a simple sequential replacement
replacements = [
    '<Link to="/eventra/seats/cinema-enhanced">',
    '<Link to="/eventra/seats/concert-enhanced">',
    '<Link to="/eventra/seats/stadium">',
    '<Link to="/eventra/seats/cinema">',
    '<Link to="/eventra/seats/concert">',
]

for rep in replacements:
    c1 = c1.replace('<Link to="/eventra/events/1">', rep, 1)

# Remove any href="#" to avoid scrolling bugs
c1 = c1.replace('href="#"', 'href="javascript:void(0)"')

with open(f1, 'w', encoding='utf-8') as f:
    f.write(c1)

print("Updated Landing Page paths!")
