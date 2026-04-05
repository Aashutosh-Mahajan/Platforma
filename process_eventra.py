import os
import re
import json

stitch_dir = 'Stitch_Screens'
zesty_dir = 'frontend/zesty-app'

EVENTRA_COLORS = {
    "on-primary-container": "#f3ecff",
    "inverse-on-surface": "#f2f0f6",
    "secondary-fixed": "#e4e2e4",
    "on-error": "#ffffff",
    "surface-container-high": "#e9e7ed",
    "primary": "#5426e4",
    "on-primary": "#ffffff",
    "primary-container": "#6d49fd",
    "outline": "#797587",
    "primary-fixed-dim": "#c9beff",
    "on-primary-fixed": "#1b0063",
    "secondary": "#5f5e60",
    "tertiary-fixed-dim": "#c8c3dd",
    "surface-variant": "#e3e1e7",
    "on-tertiary-fixed-variant": "#474459",
    "surface-dim": "#dbd9df",
    "on-secondary-fixed-variant": "#474649",
    "tertiary-fixed": "#e4dff9",
    "on-tertiary": "#ffffff",
    "surface-container-lowest": "#ffffff",
    "on-primary-fixed-variant": "#4600d7",
    "primary-fixed": "#e6deff",
    "on-surface": "#1b1b20",
    "inverse-primary": "#c9beff",
    "on-secondary-fixed": "#1b1b1d",
    "on-secondary": "#ffffff",
    "surface-container": "#efedf3",
    "error": "#ba1a1a",
    "on-tertiary-fixed": "#1b192c",
    "surface-container-highest": "#e3e1e7",
    "background": "#fbf8fe",
    "surface-container-low": "#f5f3f9",
    "surface": "#fbf8fe",
    "on-secondary-container": "#636264",
    "inverse-surface": "#303035",
    "surface-tint": "#5e36ee",
    "tertiary-container": "#6d6a80",
    "error-container": "#ffdad6",
    "secondary-container": "#e2dfe1",
    "on-background": "#1b1b20",
    "secondary-fixed-dim": "#c8c6c8",
    "outline-variant": "#c9c3d9",
    "on-surface-variant": "#484556",
    "on-tertiary-container": "#f2edff",
    "surface-bright": "#fbf8fe",
    "on-error-container": "#93000a",
    "tertiary": "#545267"
}

# 1. Update tailwind.config.js
tailwind_path = os.path.join(zesty_dir, 'tailwind.config.js')
with open(tailwind_path, 'r', encoding='utf-8') as f:
    tailwind_cfg = f.read()

# We look for "colors": {
colors_match = re.search(r'"colors"\s*:\s*\{', tailwind_cfg)

if colors_match:
    insert_idx = colors_match.end()
    
    eventra_color_str = ""
    for k, v in EVENTRA_COLORS.items():
        eventra_color_str += f'\n            "eventra-{k}": "{v}",'
    
    if "eventra-primary" not in tailwind_cfg:
        new_tailwind = tailwind_cfg[:insert_idx] + eventra_color_str + tailwind_cfg[insert_idx:]
        
        # Also add Eventra font families
        font_match = re.search(r'"fontFamily"\s*:\s*\{', new_tailwind)
        if font_match:
            f_insert_idx = font_match.end()
            eventra_fonts = '\n            "eventra-headline": ["Inter", "sans-serif"],\n            "eventra-body": ["Inter", "sans-serif"],\n            "eventra-label": ["Be Vietnam Pro", "sans-serif"],'
            new_tailwind = new_tailwind[:f_insert_idx] + eventra_fonts + new_tailwind[f_insert_idx:]
            
        with open(tailwind_path, 'w', encoding='utf-8') as f:
            f.write(new_tailwind)
        print("Updated tailwind.config.js")
else:
    print("Could not find colors object in tailwind config")

prefixes_to_replace = [
    'bg-', 'text-', 'border-', 'from-', 'via-', 'to-', 
    'hover:bg-', 'hover:text-', 'hover:border-',
    'focus:ring-', 'focus:border-', 'active:bg-',
    'dark:bg-', 'dark:text-', 'dark:border-', 'dark:hover:bg-', 'dark:hover:text-',
    'selection:bg-', 'selection:text-', 'focus-within:border-', 'shadow-' # we won't modify shadow- randomly, only color classes
]

color_keys = list(EVENTRA_COLORS.keys())

def replace_classes(content):
    # This regex is meant to find exact class names bounded by quotes or spaces
    # It's an html file so we look inside class="..."
    
    def replacer(match):
        cls_str = match.group(1)
        classes = cls_str.split()
        new_classes = []
        for c in classes:
            # Check fonts
            if c == 'font-headline':
                new_classes.append('font-eventra-headline')
                continue
            if c == 'font-body':
                new_classes.append('font-eventra-body')
                continue
            if c == 'font-label':
                new_classes.append('font-eventra-label')
                continue
                
            replaced = False
            for p in prefixes_to_replace:
                if c.startswith(p):
                    color_part = c[len(p):]
                    # We might have opacity like bg-primary/20
                    parts = color_part.split('/')
                    base_color = parts[0]
                    if base_color in color_keys:
                        new_classes.append(f"{p}eventra-{color_part}")
                        replaced = True
                        break
            if not replaced:
                new_classes.append(c)
        return 'class="' + ' '.join(new_classes) + '"'

    return re.sub(r'class="([^"]*)"', replacer, content)

os.makedirs(os.path.join(zesty_dir, 'src', 'pages', 'eventra'), exist_ok=True)
os.makedirs(os.path.join(zesty_dir, 'src', 'components', 'eventra'), exist_ok=True)

# Loop all html files and convert to React components
for file in os.listdir(stitch_dir):
    if file.endswith('.html'):
        with open(os.path.join(stitch_dir, file), 'r', encoding='utf-8') as f:
            content = f.read()
            
        new_content = replace_classes(content)
        
        # We need to extract the <body> contents (or <nav>, <main>, <footer>)
        body_match = re.search(r'<body[^>]*>(.*)</body>', new_content, re.DOTALL | re.IGNORECASE)
        if body_match:
            body_html = body_match.group(1)
        else:
            body_html = new_content
            
        # Basic cleanup from HTML to JSX
        jsx = body_html.replace('class=', 'className=')
        # Close img tags
        jsx = re.sub(r'(<img[^>]*?[^/])>', r'\1 />', jsx)
        # Close input tags
        jsx = re.sub(r'(<input[^>]*?[^/])>', r'\1 />', jsx)
        # Remove comments
        jsx = re.sub(r'<!--.*?-->', '', jsx, flags=re.DOTALL)
        
        component_name = file.replace('.html', '').replace('_', '')
        
        react_code = f"""import React from 'react';

const {component_name} = () => {{
  return (
    <div className="theme-eventra eventra-scrollbar selection:bg-eventra-primary-fixed selection:text-eventra-on-primary-fixed bg-eventra-background min-h-screen text-eventra-on-surface font-eventra-body">
      {jsx}
    </div>
  );
}};

export default {component_name};
"""
        with open(os.path.join(zesty_dir, 'src', 'pages', 'eventra', f'{component_name}.jsx'), 'w', encoding='utf-8') as f:
            f.write(react_code)
        
        print(f"Generated {component_name}.jsx")

