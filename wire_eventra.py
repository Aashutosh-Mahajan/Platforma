import os

pages_dir = 'frontend/zesty-app/src/pages/eventra'

# 1. Update EventraLandingPage
f1 = os.path.join(pages_dir, 'EventraLandingPage.jsx')
with open(f1, 'r', encoding='utf-8') as f:
    c1 = f.read()

c1 = c1.replace("import React from 'react';", "import React from 'react';\nimport { Link } from 'react-router-dom';")
# Replace Book Now buttons
c1 = c1.replace('Book Now</button>', 'Book Now</button></Link>')
c1 = c1.replace('<button className="bg-eventra-primary text-eventra-on-primary px-6 py-2 rounded-xl font-bold font-eventra-label text-sm hover:scale-105 active:scale-95 transition-transform">', '<Link to="/eventra/events/1"><button className="bg-eventra-primary text-eventra-on-primary px-6 py-2 rounded-xl font-bold font-eventra-label text-sm hover:scale-105 active:scale-95 transition-transform">')

# Replace Book buttons
c1 = c1.replace('Book</button>', 'Book</button></Link>')
c1 = c1.replace('<button className="bg-eventra-primary text-eventra-on-primary px-8 py-3 rounded-2xl font-bold font-eventra-label hover:scale-105 transition-transform">', '<Link to="/eventra/events/1"><button className="bg-eventra-primary text-eventra-on-primary px-8 py-3 rounded-2xl font-bold font-eventra-label hover:scale-105 transition-transform">')

with open(f1, 'w', encoding='utf-8') as f:
    f.write(c1)

# 2. Update EventDetailsandBooking.jsx
f2 = os.path.join(pages_dir, 'EventDetailsandBooking.jsx')
with open(f2, 'r', encoding='utf-8') as f:
    c2 = f.read()

c2 = c2.replace("import React from 'react';", "import React from 'react';\nimport { Link } from 'react-router-dom';")
c2 = c2.replace('Book Tickets</button>', 'Book Tickets</button></Link>')
c2 = c2.replace('<button className="bg-eventra-primary text-eventra-on-primary px-10 py-5 rounded-2xl font-bold font-eventra-label text-lg hover:scale-105 active:scale-95 transition-all shadow-xl group flex items-center justify-center gap-3">', '<Link to="/eventra/events/1/seats"><button className="bg-eventra-primary text-eventra-on-primary px-10 py-5 rounded-2xl font-bold font-eventra-label text-lg hover:scale-105 active:scale-95 transition-all shadow-xl group flex items-center justify-center gap-3 w-full">')

with open(f2, 'w', encoding='utf-8') as f:
    f.write(c2)

# 3. Update EnhancedStadiumMapSelection.jsx
f3 = os.path.join(pages_dir, 'EnhancedStadiumMapSelection.jsx')
with open(f3, 'r', encoding='utf-8') as f:
    c3 = f.read()

c3 = c3.replace("import React from 'react';", "import React from 'react';\nimport { useNavigate } from 'react-router-dom';")
c3 = c3.replace('const EnhancedStadiumMapSelection = () => {', 'const EnhancedStadiumMapSelection = () => {\n  const navigate = useNavigate();')
c3 = c3.replace('<button className="w-full bg-eventra-primary text-eventra-on-primary py-4 rounded-xl font-bold font-eventra-label text-lg hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-lg shadow-eventra-primary/20">', '<button onClick={() => navigate("/eventra/checkout")} className="w-full bg-eventra-primary text-eventra-on-primary py-4 rounded-xl font-bold font-eventra-label text-lg hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-lg shadow-eventra-primary/20">')

with open(f3, 'w', encoding='utf-8') as f:
    f.write(c3)

print("Linked Successfully!")
