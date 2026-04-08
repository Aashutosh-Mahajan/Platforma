"""
Zesty App - Mumbai Pure Veg Restaurant Data Generator
Generates 700-800 realistic Mumbai restaurants with full menus, ratings, locations.
Each cuisine category has 10+ restaurants. Each restaurant has 10-15 dishes.
"""

import json
import random

# ─────────────────────────────────────────────
#  SEED FOR REPRODUCIBILITY
# ─────────────────────────────────────────────
random.seed(42)

# ─────────────────────────────────────────────
#  MUMBAI STATIONS / LOCALITIES
# ─────────────────────────────────────────────
MUMBAI_LOCATIONS = [
    "Andheri", "Bandra", "Borivali", "Dadar", "Malad", "Kandivali",
    "Goregaon", "Jogeshwari", "Vile Parle", "Santacruz", "Khar",
    "Kurla", "Ghatkopar", "Mulund", "Thane", "Vikhroli", "Bhandup",
    "Nahur", "Kanjurmarg", "Byculla", "Matunga", "Sion", "Chunabhatti",
    "Wadala", "Cotton Green", "Reay Road", "Dockyard", "Sandhurst",
    "Chembur", "Govandi", "Mankhurd", "Vashi", "Kopar Khairane",
    "Nerul", "Belapur", "Panvel", "Dombivli", "Kalyan", "Ulhasnagar",
    "Ambarnath", "Badlapur", "Titwala", "Kasara", "Vasai", "Virar",
    "Nalasopara", "Mira Road", "Dahisar", "Borivali East", "Malad West",
    "Andheri West", "Andheri East", "Santacruz West", "Santacruz East",
    "Khar West", "Bandra West", "Bandra East", "Churchgate", "Marine Lines",
    "Charni Road", "Grant Road", "Mumbai Central", "Mahalaxmi", "Lower Parel",
    "Prabhadevi", "Parel", "Elphinstone", "Currey Road", "Chinchpokli",
    "Tardeo", "Worli", "Haji Ali", "Peddar Road", "Breach Candy",
    "Colaba", "Nariman Point", "Fort", "CST", "Dhobi Talao",
    "Girgaon", "Bhuleshwar", "Kalbadevi", "Crawford Market", "Null Bazaar",
    "Mazgaon", "Dockyard Road", "Sewri", "Trombay", "Powai",
    "Chandivali", "SEEPZ", "Sakinaka", "Marol", "Chakala",
    "Versova", "Lokhandwala", "DN Nagar", "Oshiwara", "Mandapeshwar",
    "Poisar", "Eksar", "IC Colony", "Pahadi Goregaon", "Film City",
    "Magathane", "Bhayander", "Thane West", "Thane East", "Kopri",
]

# ─────────────────────────────────────────────
#  DISH BANK — organised by cuisine tag
# ─────────────────────────────────────────────

DISH_BANK = {

    # ── NORTH INDIAN ──────────────────────────
    "north_indian": [
        ("Dal Makhani", 180, "Slow-cooked black lentils in a rich tomato-butter gravy"),
        ("Paneer Butter Masala", 220, "Soft paneer cubes in velvety tomato-cream sauce"),
        ("Shahi Paneer", 230, "Paneer in a royal cashew-onion gravy with mild spices"),
        ("Kadai Paneer", 210, "Paneer tossed with bell peppers in a spiced kadai masala"),
        ("Paneer Tikka Masala", 240, "Grilled paneer in a smoky tikka gravy"),
        ("Palak Paneer", 200, "Fresh spinach puree with soft paneer cubes"),
        ("Matar Paneer", 195, "Green peas and paneer in a tangy tomato onion gravy"),
        ("Rajma Masala", 170, "Kidney beans simmered in a thick Punjabi masala"),
        ("Chole Masala", 160, "Spiced chickpeas in a tangy-spicy North Indian style"),
        ("Aloo Gobi", 150, "Cauliflower and potato sabzi with cumin and spices"),
        ("Baingan Bharta", 160, "Roasted smoky eggplant mashed with onion and tomato"),
        ("Mix Veg Curry", 170, "Seasonal vegetables in a flavorful North Indian gravy"),
        ("Butter Naan", 40, "Soft tandoor-baked flatbread brushed with butter"),
        ("Garlic Naan", 45, "Naan topped with roasted garlic and coriander"),
        ("Laccha Paratha", 50, "Multi-layered flaky whole-wheat flatbread"),
        ("Tandoori Roti", 30, "Whole wheat roti straight from the tandoor"),
        ("Jeera Rice", 120, "Basmati rice tempered with cumin and ghee"),
        ("Veg Biryani", 180, "Aromatic basmati rice layered with mixed vegetables"),
        ("Masala Chaas", 60, "Spiced buttermilk with roasted cumin and mint"),
        ("Gulab Jamun", 80, "Soft milk-solid dumplings soaked in rose-flavoured sugar syrup"),
    ],

    # ── SOUTH INDIAN ──────────────────────────
    "south_indian": [
        ("Masala Dosa", 120, "Crispy rice crepe filled with spiced potato filling"),
        ("Plain Dosa", 90, "Thin golden crispy dosa served with chutneys and sambar"),
        ("Rava Dosa", 110, "Lacy semolina dosa with a crispy netted texture"),
        ("Onion Rava Dosa", 120, "Rava dosa loaded with fresh onions and green chilli"),
        ("Mysore Masala Dosa", 130, "Dosa spread with spicy red chutney and potato masala"),
        ("Uttapam", 110, "Thick savoury pancake topped with onion, tomato and coriander"),
        ("Idli (2 pcs)", 80, "Steamed rice and lentil cakes served with sambar and chutney"),
        ("Mini Idli (12 pcs)", 110, "Bite-sized idlis dunked in flavourful sambar"),
        ("Medu Vada (2 pcs)", 90, "Crispy urad dal fritters with coconut chutney"),
        ("Sambar Vada", 100, "Medu vada soaked in hot sambar with onion and coriander"),
        ("Upma", 80, "Semolina porridge tempered with mustard, curry leaf and vegetables"),
        ("Pongal", 90, "Comforting rice and moong dal porridge with pepper and ghee"),
        ("Curd Rice", 90, "Soft rice mixed with curd and tempered with mustard and curry leaf"),
        ("Coconut Chutney", 20, "Fresh coconut ground with green chilli and tempered with mustard"),
        ("Tomato Chutney", 20, "Tangy roasted tomato chutney with red chilli"),
        ("Filter Coffee", 60, "South Indian decoction coffee with frothy hot milk"),
        ("Kesari Bath", 70, "Sweet semolina halwa with saffron, cashew and raisins"),
        ("Set Dosa (3 pcs)", 100, "Soft spongy dosa trio served with chutney and sambar"),
        ("Pesarattu", 110, "Green moong dal dosa with ginger and onion filling"),
        ("Appam with Stew", 130, "Lacy rice-coconut pancake with mild vegetable coconut stew"),
    ],

    # ── MAHARASHTRIAN ─────────────────────────
    "maharashtrian": [
        ("Misal Pav", 100, "Sprouted moth beans curry topped with farsan, onion and lemon"),
        ("Pav Bhaji", 110, "Buttery spiced mixed vegetable mash with soft pav buns"),
        ("Vada Pav", 30, "Mumbai's iconic spiced potato fritter in a soft bun with chutneys"),
        ("Sabudana Khichdi", 110, "Tapioca pearls tossed with peanuts, green chilli and cumin"),
        ("Thalipeeth", 90, "Multi-grain crispy pancake with spices and coriander"),
        ("Bharli Vangi", 160, "Baby brinjal stuffed with peanut-coconut masala"),
        ("Pitla Bhakri", 120, "Gram flour curry with jowar flatbread"),
        ("Zunka Bhakar", 110, "Dry besan preparation with jowar bhakri"),
        ("Kande Pohe", 80, "Flattened rice with onion, turmeric and mustard seeds"),
        ("Batata Vada", 40, "Spiced mashed potato ball in a chickpea batter, deep-fried"),
        ("Shira", 70, "Warm semolina halwa with ghee, cardamom and dry fruits"),
        ("Sol Kadhi", 50, "Refreshing kokum and coconut milk digestive drink"),
        ("Ukad", 70, "Soft rice flour dumplings steamed with coconut and jaggery"),
        ("Modak (2 pcs)", 80, "Steamed rice dumplings filled with sweetened coconut and jaggery"),
        ("Amti Dal", 120, "Tangy Maharashtrian lentil curry with kokum and coconut"),
        ("Masala Bhaat", 130, "Spiced rice with vegetables and Maharashtrian goda masala"),
        ("Puran Poli", 80, "Sweet flatbread stuffed with chana dal and jaggery"),
        ("Matki Usal", 120, "Sprouted moth beans in a tangy onion-coconut gravy"),
    ],

    # ── GUJARATI ──────────────────────────────
    "gujarati": [
        ("Gujarati Thali", 280, "Complete thali with dal, kadhi, sabzi, rotli, rice, farsan and sweet"),
        ("Dhokla", 90, "Steamed fermented chickpea flour cake with mustard and coriander"),
        ("Handvo", 110, "Baked savoury rice and lentil cake with bottle gourd"),
        ("Khaman", 80, "Soft spongy steamed gram flour snack with a sweet-tangy tadka"),
        ("Fafda Jalebi", 90, "Crunchy chickpea flour strips with crispy sweet jalebis"),
        ("Sev Usal", 90, "Dried peas curry topped with sev, onion and coriander"),
        ("Kadhi", 100, "Tangy sweet yoghurt-based gravy tempered with mustard and curry leaf"),
        ("Undhiyu", 180, "Mixed winter vegetable casserole with fenugreek dumplings"),
        ("Surti Locho", 100, "Soft steamed chana dal snack with sev and spices"),
        ("Methi Thepla", 70, "Thin fenugreek flatbread with sesame seeds and spices"),
        ("Rotlo with Ghee", 60, "Bajra flatbread served with pure ghee and jaggery"),
        ("Shrikhand", 90, "Strained yoghurt dessert flavoured with cardamom and saffron"),
        ("Mohanthal", 80, "Rich gram flour fudge with ghee, cardamom and nuts"),
        ("Aam Ras", 80, "Sweet fresh Alphonso mango pulp"),
        ("Lilva Kachori", 90, "Flaky pastry stuffed with fresh green pigeon peas and spices"),
    ],

    # ── RAJASTHANI ────────────────────────────
    "rajasthani": [
        ("Dal Baati Churma", 220, "Baked wheat dough balls with five-lentil dal and crumbled sweet churma"),
        ("Gatte ki Sabzi", 160, "Gram flour dumplings in a tangy yoghurt-based gravy"),
        ("Ker Sangri", 160, "Desert beans and dried berries cooked in spiced mustard oil"),
        ("Rajasthani Thali", 300, "Grand platter with dal, baati, churma, sabzi, rotis and dessert"),
        ("Pyaaz Kachori", 80, "Flaky pastry stuffed with spiced onion filling"),
        ("Mirchi Bada", 60, "Large green chilli stuffed with potato and deep-fried in gram batter"),
        ("Mawa Kachori", 90, "Sweet stuffed pastry filled with khoya and dry fruits"),
        ("Laal Maas (Veg)", 180, "Fiery red Rajasthani curry made with seasonal vegetables"),
        ("Bajre ki Roti", 40, "Pearl millet flatbread served with ghee and garlic chutney"),
        ("Besan Chakki", 80, "Steamed gram flour squares in a spiced gravy"),
        ("Moong Dal Halwa", 120, "Rich slow-roasted moong dal dessert with ghee and cardamom"),
        ("Ghevar", 100, "Disc-shaped honeycomb sweet drenched in sugar syrup and rabri"),
        ("Rabri", 90, "Reduced thickened sweetened milk with cardamom and nuts"),
        ("Dahi Baati", 180, "Baked wheat balls soaked in creamy sweet curd"),
    ],

    # ── CHINESE (VEG) ─────────────────────────
    "chinese": [
        ("Veg Manchurian Gravy", 180, "Fried vegetable dumplings in a tangy Indo-Chinese sauce"),
        ("Veg Manchurian Dry", 160, "Crispy veggie balls tossed in a spicy garlic-soy sauce"),
        ("Gobi Manchurian", 160, "Crispy cauliflower florets in a sweet-tangy Indo-Chinese sauce"),
        ("Paneer Chilli", 200, "Paneer cubes stir-fried with capsicum and chilli sauce"),
        ("Paneer Manchurian", 200, "Fried paneer in a sticky Indo-Chinese manchurian sauce"),
        ("Veg Hakka Noodles", 160, "Stir-fried noodles with mixed vegetables and soy sauce"),
        ("Schezwan Noodles", 170, "Spicy Schezwan-sauced noodles with crispy vegetables"),
        ("Veg Fried Rice", 150, "Wok-tossed rice with vegetables, soy sauce and spring onion"),
        ("Schezwan Fried Rice", 160, "Spicy Schezwan-flavoured rice with mixed vegetables"),
        ("Veg Spring Rolls", 140, "Crispy rolls stuffed with spiced cabbage, carrot and noodles"),
        ("Corn Soup", 100, "Thick sweet corn soup with vegetable broth and white pepper"),
        ("Hot & Sour Soup", 100, "Tangy spicy broth with mushrooms, tofu and vinegar"),
        ("Dimsums (4 pcs)", 160, "Steamed vegetable dumplings with chilli-ginger dipping sauce"),
        ("Fried Wontons", 130, "Crispy wontons stuffed with spiced veggies"),
        ("Sizzler Plate", 250, "Mixed vegetables on a hot iron plate with noodles and sauce"),
    ],

    # ── FRIED RICE ────────────────────────────
    "fried_rice": [
        ("Veg Fried Rice", 150, "Wok-tossed basmati with seasonal vegetables and soy sauce"),
        ("Schezwan Fried Rice", 165, "Spicy Schezwan-sauced fried rice with crunchy veggies"),
        ("Peri Peri Fried Rice", 170, "Fried rice tossed in tangy peri peri sauce with bell peppers"),
        ("Paneer Fried Rice", 185, "Basmati rice stir-fried with paneer, soy and chilli"),
        ("Mushroom Fried Rice", 175, "Fried rice with button mushrooms, spring onion and garlic"),
        ("Triple Schezwan Rice", 180, "Extra spicy three-chilli Schezwan fried rice"),
        ("Singapore Fried Rice", 175, "Mildly spiced rice with mixed vegetables and curry leaf"),
        ("Thai Fried Rice", 175, "Jasmine rice wok-tossed with basil, bell peppers and chilli"),
        ("Kimchi Fried Rice (Veg)", 180, "Fried rice with Korean-inspired tangy kimchi and sesame"),
        ("Pineapple Fried Rice", 180, "Sweet-savoury rice with pineapple chunks and cashews"),
        ("Egg-less Fried Rice", 140, "Classic fried rice without egg for pure veg lovers"),
        ("Corn & Capsicum Fried Rice", 160, "Sweet corn, capsicum and herbs in perfectly fried rice"),
    ],

    # ── PIZZA ─────────────────────────────────
    "pizza": [
        ("Margherita Pizza (7\")", 160, "Classic tomato sauce, mozzarella and basil on hand-tossed crust"),
        ("Farmhouse Pizza (7\")", 200, "Onion, capsicum, tomato and mushroom on a rich pizza base"),
        ("Paneer Tikka Pizza (7\")", 220, "Tandoori paneer with onion, capsicum on minted pizza sauce"),
        ("Peppy Paneer Pizza (7\")", 210, "Spicy paneer chunks with jalapeño and tangy tomato sauce"),
        ("Double Cheese Pizza (7\")", 220, "Extra mozzarella and cheddar loaded pizza"),
        ("BBQ Onion Pizza (7\")", 195, "Caramelised onion with smoky BBQ sauce and mozzarella"),
        ("Corn & Pesto Pizza (7\")", 195, "Sweet corn with homemade basil pesto and mozzarella"),
        ("Spinach & Ricotta Pizza (7\")", 200, "Fresh spinach, ricotta and pine nuts on a thin crust"),
        ("Mexicana Pizza (7\")", 205, "Jalapeño, capsicum, red kidney beans on salsa base"),
        ("Peri Peri Veg Pizza (7\")", 205, "Zesty peri peri sauce with crunchy veggies and herbs"),
        ("Loaded Cheesy Garlic Bread", 120, "Thick garlic bread smothered in mozzarella and herbs"),
        ("Whole Wheat Pizza (7\")", 185, "Healthy whole-wheat base with tomato, veggies and cheese"),
        ("White Sauce Pizza (7\")", 210, "Creamy béchamel sauce with mushroom, corn and mozzarella"),
    ],

    # ── PAV BHAJI ─────────────────────────────
    "pav_bhaji": [
        ("Classic Pav Bhaji", 110, "Buttery spiced mixed veggie mash served with soft toasted buns"),
        ("Cheese Pav Bhaji", 140, "Pav bhaji topped with a generous layer of melted cheese"),
        ("Paneer Pav Bhaji", 150, "Classic pav bhaji with chunks of soft fresh paneer"),
        ("Mushroom Pav Bhaji", 145, "Pav bhaji with sautéed mushrooms for an earthy flavour"),
        ("Kolhapuri Pav Bhaji", 120, "Fiery spicy pav bhaji with Kolhapuri masala"),
        ("Dum Pav Bhaji", 130, "Pav bhaji slow-cooked on dum for a deeper flavour"),
        ("Pav Bhaji Fondue", 180, "Thick bhaji served in a bread bowl with melted cheese"),
        ("Jain Pav Bhaji", 115, "Pav bhaji without onion and garlic, Jain-friendly"),
        ("Khada Pav Bhaji", 120, "Bhaji with chunky unblended vegetables for added texture"),
        ("Tawa Pav Bhaji", 110, "Street-style pav bhaji cooked on a large iron tawa"),
        ("Bhaji (Extra)", 40, "Extra serving of spiced vegetable bhaji"),
        ("Butter Pav (2 pcs)", 30, "Soft dinner rolls toasted on tawa with generous butter"),
    ],

    # ── SANDWICH ──────────────────────────────
    "sandwich": [
        ("Mumbai Masala Toast Sandwich", 90, "Layered sandwich with potato, chutney, tomato and cheese grilled"),
        ("Club Sandwich", 130, "Triple-decker with veggies, cheese and tangy mayo"),
        ("Paneer Tikka Sandwich", 140, "Grilled paneer tikka with onion, capsicum and mint chutney"),
        ("Corn & Cheese Grilled Sandwich", 120, "Sweet corn and mozzarella melt on buttered bread"),
        ("Veg Cheese Grill", 110, "Tomato, capsicum, onion with cheese in a crispy grilled sandwich"),
        ("Cucumber & Cream Cheese Sandwich", 90, "Cool cucumber and herbed cream cheese on whole wheat"),
        ("Tandoori Paneer Sub", 150, "6-inch sub roll with tandoori paneer and coleslaw"),
        ("Bombay Grilled Sandwich", 100, "Mumbai-style spiced sandwich with boiled veggies and chutney"),
        ("Mexican Wrap Sandwich", 130, "Salsa, jalapeño, beans and cheese in a toasted tortilla"),
        ("Schezwan Grilled Sandwich", 120, "Schezwan sauce, veggies and cheese in a crispy grill"),
        ("Avocado Toast Sandwich", 150, "Smashed avocado on sourdough with cherry tomato and herbs"),
        ("Open-Face Bruschetta", 100, "Toasted baguette with tomato, basil and olive oil"),
    ],

    # ── CHAAT ─────────────────────────────────
    "chaat": [
        ("Pani Puri (6 pcs)", 60, "Crispy hollow puris filled with spiced water, potato and chutney"),
        ("Sev Puri (6 pcs)", 70, "Flat puris topped with potato, chutney, onion and sev"),
        ("Bhel Puri", 70, "Puffed rice with sev, onion, tomato and tangy chutneys"),
        ("Ragda Pattice", 90, "Spiced potato patties topped with white peas ragda and chutneys"),
        ("Dahi Puri (6 pcs)", 90, "Puris filled with yoghurt, chutney and sweet sev"),
        ("Papdi Chaat", 90, "Crispy papdis topped with curd, chutneys, potato and sev"),
        ("Aloo Tikki Chaat", 90, "Crispy potato patties with ragda, chutneys and yoghurt"),
        ("Samosa Chaat", 100, "Crushed samosa with chole, yoghurt and chutneys"),
        ("Dahi Bhalla", 100, "Soft urad lentil dumplings in sweet yoghurt with chutneys"),
        ("Kachori Chaat", 100, "Flaky kachori topped with chole, onion, chutneys and sev"),
        ("Corn Chaat", 80, "Roasted sweet corn with butter, spices and lemon"),
        ("Chole Tikki", 110, "Aloo tikki topped with spicy chole and tangy yoghurt"),
        ("Gol Gappe", 60, "Crispy shells served with three flavoured waters"),
        ("Matar Kulcha", 100, "Spiced dried peas with soft kulcha bread"),
    ],

    # ── CHOLE BHATURE ─────────────────────────
    "chole_bhature": [
        ("Chole Bhature (2 pcs)", 140, "Spicy Punjabi chole with soft deep-fried bhatura bread"),
        ("Chole Puri (4 pcs)", 110, "Fluffed puri bread with thick spiced chickpea curry"),
        ("Amritsari Chole Bhature", 150, "Authentic Amritsar-style tangy chole with crispy bhatura"),
        ("Paneer Bhatura", 160, "Paneer-stuffed bhatura with classic chole"),
        ("Mini Bhature (4 pcs)", 130, "Bite-sized soft bhature with chole — perfect for sharing"),
        ("Masala Bhatura (2 pcs)", 150, "Spiced potato-stuffed bhatura with rich chole"),
        ("Half Plate Chole", 80, "Half portion of Punjabi chole with two puris"),
        ("Chole Rice Thali", 180, "Chole served with jeera rice, raita, salad and papad"),
        ("Chole Khichdi", 160, "Comforting moong dal khichdi served alongside spiced chole"),
        ("Kulcha Chole", 130, "Soft tandoor-baked kulcha bread with spiced chole"),
    ],

    # ── THALI ─────────────────────────────────
    "thali": [
        ("North Indian Thali", 280, "Dal, paneer sabzi, roti, rice, raita, salad, papad and sweet"),
        ("South Indian Thali", 260, "Sambar, rasam, rice, two sabzis, papad, payasam and chutneys"),
        ("Gujarati Thali", 290, "Dal, kadhi, three sabzis, rotli, puri, rice, farsan and sweet"),
        ("Rajasthani Thali", 310, "Dal baati, churma, gatte ki sabzi, ker sangri, missi roti and halwa"),
        ("Maharashtrian Thali", 260, "Amti, bhaji, bhakri, rice, papad, pickle and shrikhand"),
        ("Mini Thali", 180, "Dal, one sabzi, roti, rice, raita and sweet"),
        ("Jain Thali", 270, "Jain-friendly dal, sabzi without root vegetables, roti, rice and sweet"),
        ("Deluxe Veg Thali", 350, "Bumper thali with four sabzis, dal, rice, roti, dessert and chaas"),
        ("Satvik Thali", 240, "Pure sattvic meal without onion and garlic, with seasonal vegetables"),
        ("Khichdi Thali", 200, "Dal khichdi, kadhi, papad, pickle, ghee and chaas"),
        ("Festival Thali", 350, "Special seasonal thali prepared for festive occasions"),
    ],

    # ── PARATHA ───────────────────────────────
    "paratha": [
        ("Aloo Paratha (2 pcs)", 100, "Whole wheat flatbread stuffed with spiced mashed potato"),
        ("Paneer Paratha (2 pcs)", 130, "Paratha stuffed with crumbled spiced paneer filling"),
        ("Gobi Paratha (2 pcs)", 110, "Flaky paratha with spiced grated cauliflower stuffing"),
        ("Methi Paratha (2 pcs)", 90, "Crispy fenugreek flatbread with carom seeds and green chilli"),
        ("Palak Paratha (2 pcs)", 95, "Spinach-enriched green paratha with mild spices"),
        ("Mix Veg Paratha (2 pcs)", 115, "Paratha packed with seasonal mixed vegetable filling"),
        ("Mooli Paratha (2 pcs)", 100, "Paratha stuffed with grated white radish and spices"),
        ("Cheese Paratha (2 pcs)", 130, "Paratha with a molten cheese interior and buttery finish"),
        ("Onion Paratha (2 pcs)", 95, "Thin crispy paratha with caramelised onion stuffing"),
        ("Dal Paratha (2 pcs)", 100, "Paratha stuffed with spiced cooked chana dal"),
        ("Laccha Paratha (2 pcs)", 90, "Multi-layered crispy paratha with pure ghee"),
        ("Plain Paratha with Curd", 80, "Simple buttered paratha served with thick fresh curd"),
    ],

    # ── KULCHE ────────────────────────────────
    "kulche": [
        ("Amritsari Kulcha (2 pcs)", 130, "Thick stuffed kulcha baked in tandoor served with chole"),
        ("Aloo Kulcha (2 pcs)", 110, "Soft kulcha stuffed with spiced mashed potato"),
        ("Paneer Kulcha (2 pcs)", 140, "Kulcha filled with crumbled paneer and spices"),
        ("Onion Kulcha (2 pcs)", 120, "Kulcha stuffed with caramelised onion and green chilli"),
        ("Mix Kulcha (2 pcs)", 130, "Kulcha with a mixed filling of potato, paneer and spices"),
        ("Plain Kulcha (2 pcs)", 80, "Soft plain tandoor-baked kulcha with butter"),
        ("Gobi Kulcha (2 pcs)", 120, "Kulcha stuffed with spiced grated cauliflower"),
        ("Masala Kulcha (2 pcs)", 120, "Spice-packed kulcha with a chilli-garlic masala filling"),
        ("Cheese Kulcha (2 pcs)", 150, "Cheesy kulcha oozing with melted mozzarella"),
        ("Dal Makhani with Kulcha", 190, "Rich creamy dal makhani served alongside two buttered kulchas"),
    ],

    # ── ROLLS ─────────────────────────────────
    "rolls": [
        ("Paneer Tikka Roll", 140, "Grilled paneer with mint chutney and onion in a paratha roll"),
        ("Veg Kathi Roll", 120, "Spiced vegetable filling in a soft paratha roll"),
        ("Schezwan Paneer Roll", 150, "Paneer in spicy Schezwan sauce wrapped in a thin roll"),
        ("Cheese Corn Roll", 130, "Corn and cheese filling in a toasted whole wheat roll"),
        ("Mushroom Tikka Roll", 140, "Smoky grilled mushrooms with onion and chutney in a roll"),
        ("Aloo Tikki Roll", 110, "Crispy potato tikki with coriander chutney in a wrap"),
        ("Achari Paneer Roll", 145, "Tangy pickle-spiced paneer in a flaky paratha"),
        ("Soya Chaap Roll", 150, "Marinated mock-meat soya chaap grilled in a paratha roll"),
        ("Double Cheese Veg Roll", 155, "Extra cheese with grilled vegetables in a paratha roll"),
        ("Frankie Roll", 130, "Mumbai street-style roll with spiced potato and egg-free masala"),
        ("Peri Peri Veg Roll", 140, "Peri peri spiced veggies with sour cream in a flour wrap"),
    ],

    # ── CHAAP ─────────────────────────────────
    "chaap": [
        ("Malai Chaap", 180, "Creamy marinated soya chaap grilled in a tandoor"),
        ("Achari Chaap", 185, "Tangy pickle-marinated soya chaap with onion and capsicum"),
        ("Afghani Chaap", 190, "Cashew and cream marinated chaap with a mild smoky flavour"),
        ("Tandoori Chaap", 175, "Classic tandoor-grilled soya chaap with chutney and salad"),
        ("Chaap Tikka", 180, "Cubed soya chaap marinated in yoghurt and tikka spices"),
        ("Chaap Masala Curry", 195, "Soya chaap pieces simmered in a rich onion-tomato masala"),
        ("Chaap Handi", 200, "Soya chaap cooked in a sealed handi with spiced cream sauce"),
        ("Peri Peri Chaap", 185, "Chaap marinated in peri peri spice and grilled till smoky"),
        ("Tawa Chaap", 175, "Chaap sautéed on a heavy iron tawa with peppers and onions"),
        ("Chaap Biryani", 210, "Aromatic basmati biryani layered with spiced soya chaap"),
        ("Chaap Frankie", 160, "Sliced chaap wrapped in a paratha with mint chutney"),
    ],

    # ── PANEER ────────────────────────────────
    "paneer": [
        ("Paneer Butter Masala", 220, "Soft cubed paneer in a creamy tomato-butter gravy"),
        ("Kadai Paneer", 210, "Paneer with bell peppers in a coarse kadai spice gravy"),
        ("Paneer Tikka (6 pcs)", 220, "Marinated paneer grilled in tandoor, smoky and juicy"),
        ("Shahi Paneer", 230, "Paneer in a royal cashew-cream saffron sauce"),
        ("Palak Paneer", 200, "Pureed spinach with soft paneer cubes and aromatic spices"),
        ("Paneer Lababdar", 225, "Paneer in a luscious smoky tomato-onion gravy"),
        ("Paneer Bhurji", 180, "Scrambled paneer with onion, tomato and bold spices"),
        ("Paneer Do Pyaza", 210, "Paneer with double the onions in a spiced gravy"),
        ("Paneer Achari", 215, "Paneer in a tangy pickle-spiced gravy with mustard oil"),
        ("Stuffed Paneer Paratha", 130, "Thick paratha stuffed with spiced crumbled paneer"),
        ("Paneer Khurchan", 200, "Scraped-tawa style paneer with capsicum and tomato"),
        ("Paneer Handi", 230, "Paneer cooked in a sealed handi with rich aromatic gravy"),
    ],

    # ── DOSA ──────────────────────────────────
    "dosa": [
        ("Plain Dosa", 90, "Thin crispy rice-lentil dosa with sambar and coconut chutney"),
        ("Masala Dosa", 120, "Crispy dosa filled with spiced potato and onion filling"),
        ("Cheese Dosa", 130, "Dosa filled with mozzarella cheese and spiced potato"),
        ("Paneer Dosa", 140, "Dosa stuffed with spiced crumbled paneer"),
        ("Rava Masala Dosa", 130, "Lacy semolina dosa with classic potato masala filling"),
        ("Spring Dosa", 150, "Crispy dosa rolled with spiced vegetable stir-fry"),
        ("Mysore Set Dosa", 130, "Soft dosa trio spread with spicy Mysore red chutney"),
        ("Open Masala Dosa", 130, "Wide open dosa with masala filling visible and toppings"),
        ("Wheat Dosa", 100, "Whole wheat healthy dosa with sambar and chutney"),
        ("Spinach & Corn Dosa", 140, "Dosa batter enriched with spinach and sweet corn filling"),
        ("Schezwan Dosa", 150, "Fusion dosa spread with Schezwan sauce and veggies"),
        ("Butter Dosa", 110, "Extra-buttery plain dosa — crispy on edges, soft at centre"),
        ("Pesarattu Dosa", 120, "Green moong dal dosa with ginger and onion topping"),
    ],

    # ── IDLI ──────────────────────────────────
    "idli": [
        ("Plain Idli (2 pcs)", 80, "Fluffy steamed rice-urad dal cakes with sambar and chutney"),
        ("Masala Idli", 100, "Idli pieces tossed in a spiced onion-tomato tempering"),
        ("Stuffed Idli", 110, "Idli with a spiced coconut and vegetable filling inside"),
        ("Rava Idli (2 pcs)", 90, "Instant semolina idli with mustard, cashews and coriander"),
        ("Mini Idli Sambar (12 pcs)", 110, "Tiny idlis submerged in piping hot sambar with ghee"),
        ("Ghee Podi Idli", 100, "Idli drizzled in pure ghee and coated with spiced gunpowder"),
        ("Idli Fry", 100, "Leftover idlis shallow-fried crispy with a spiced seasoning"),
        ("Quinoa Idli (2 pcs)", 110, "Healthy quinoa-based idli light on the stomach"),
        ("Kanchipuram Idli (2 pcs)", 100, "Coarse-textured temple-style idli with pepper and cumin"),
        ("Tatte Idli (2 pcs)", 100, "Large flat Karnataka-style thick idli with coconut chutney"),
        ("Sambar (Extra Bowl)", 40, "A fresh extra bowl of tangy vegetable sambar"),
        ("Coconut Chutney (Extra)", 20, "Freshly ground coconut chutney with a mild tadka"),
    ],

    # ── VADA ──────────────────────────────────
    "vada": [
        ("Medu Vada (2 pcs)", 90, "Crispy doughnut-shaped urad dal fritters with chutney and sambar"),
        ("Sambar Vada", 100, "Medu vada soaked in tangy sambar with onion and coriander"),
        ("Dahi Vada", 100, "Soft vadas dunked in sweet yoghurt with chutneys and sev"),
        ("Batata Vada", 40, "Mumbai's beloved spiced potato ball in crispy chickpea batter"),
        ("Vada Pav", 35, "Batata vada in a soft bun with dry garlic chutney and green chilli"),
        ("Masala Vada (2 pcs)", 80, "South Indian spiced chana dal fritters with onion and coriander"),
        ("Bread Vada (2 pcs)", 90, "Soft vadas sandwiched between bread with green chutney"),
        ("Punugulu (6 pcs)", 90, "Bite-sized crispy urad dal fritters with onion and chilli"),
        ("Vada Sambar (2+1 bowl)", 110, "Two medu vada with an extra bowl of sambar"),
        ("Curd Vada", 100, "Soft vada in thick creamy curd with a sweet-tangy finish"),
    ],

    # ── SAMOSA ────────────────────────────────
    "samosa": [
        ("Aloo Samosa (2 pcs)", 40, "Classic deep-fried pastry stuffed with spiced potato filling"),
        ("Paneer Samosa (2 pcs)", 60, "Crispy samosa with a spiced paneer and herb filling"),
        ("Cheese Samosa (2 pcs)", 65, "Samosa oozing with melted cheese and spiced veggies"),
        ("Onion Samosa (2 pcs)", 45, "Light flaky samosa stuffed with spiced onion and coriander"),
        ("Baked Samosa (2 pcs)", 55, "Guilt-free baked version of the classic aloo samosa"),
        ("Samosa Chaat", 100, "Crushed samosa topped with chole, yoghurt and chutneys"),
        ("Keema Samosa Veg (2 pcs)", 65, "Soya granules minced and spiced like a keema filling"),
        ("Pyaaz Kachori (2 pcs)", 70, "Flaky deep-fried pastry stuffed with spiced onion"),
        ("Bhakarwadi (100g)", 70, "Crunchy spiral pastry from Pune with a sweet-spicy filling"),
        ("Mini Samosa Platter (8 pcs)", 90, "Eight bite-sized crispy samosas with mint and tamarind chutney"),
    ],

    # ── ALOO PARATHA ──────────────────────────
    "aloo_paratha": [
        ("Classic Aloo Paratha (2 pcs)", 100, "Whole wheat paratha stuffed with spiced mashed potato"),
        ("Achari Aloo Paratha (2 pcs)", 110, "Paratha with tangy pickle-spiced potato filling"),
        ("Cheese Aloo Paratha (2 pcs)", 130, "Potato paratha with a melted cheese centre"),
        ("Onion Aloo Paratha (2 pcs)", 105, "Aloo paratha with caramelised onion mixed in the filling"),
        ("Aloo Palak Paratha (2 pcs)", 105, "Potato and spinach stuffed crispy whole-wheat paratha"),
        ("Tandoori Aloo Paratha (2 pcs)", 115, "Aloo paratha baked directly in a tandoor, puffed and charred"),
        ("Masala Aloo Paratha (2 pcs)", 110, "Extra spicy potato paratha with chilli and garam masala"),
        ("Aloo Paneer Paratha (2 pcs)", 125, "Double-filled paratha with both potato and paneer"),
        ("Mini Aloo Paratha (4 pcs)", 110, "Four small parathas with spiced aloo filling"),
        ("Aloo Paratha with Mango Pickle", 105, "Classic paratha served with tangy homemade mango pickle"),
    ],

    # ── CHOLE ─────────────────────────────────
    "chole": [
        ("Chole Masala", 130, "Robust Punjabi chickpea curry with whole spices and tamarind"),
        ("Amritsari Chole", 140, "Black-tea darkened chole with bold Amritsari spices"),
        ("Chole with Rice", 170, "Spiced chole served with steamed basmati or jeera rice"),
        ("Chole Bhature (2 pcs)", 140, "Fluffy bhatura with spicy chole — North Indian street classic"),
        ("Chole Puri (4 pcs)", 110, "Crispy deep-fried puri with tangy chole"),
        ("Chole Tikka", 150, "Grilled paneer tikka placed atop spiced chole gravy"),
        ("Dry Kala Chana", 120, "Black chickpeas dry-spiced with onion and coriander"),
        ("Chole Paratha", 180, "Paratha combo with rich chole, pickle and curd on the side"),
        ("Chole Samosa Chaat", 120, "Crushed samosa in chole with tamarind and mint chutneys"),
        ("Chole Rice Bowl", 160, "A filling rice bowl topped with chole and sev"),
    ],

    # ── PULAO ─────────────────────────────────
    "pulao": [
        ("Veg Pulao", 150, "Lightly spiced basmati rice cooked with seasonal vegetables"),
        ("Peas Pulao", 140, "Fragrant basmati with fresh green peas, cloves and cardamom"),
        ("Kashmiri Pulao", 180, "Sweet saffron rice with dry fruits, nuts and mild spices"),
        ("Matar Paneer Pulao", 190, "Pulao cooked with peas and soft paneer cubes"),
        ("Tawa Pulao", 160, "Mumbai street-style spiced rice with pav bhaji masala"),
        ("Mushroom Pulao", 170, "Earthy button mushrooms with fragrant basmati rice"),
        ("Corn Pulao", 155, "Sweet corn kernels in a fragrant spiced pulao"),
        ("Coconut Milk Pulao", 160, "South-style pulao cooked in coconut milk with cashews"),
        ("Tomato Pulao", 145, "Tangy tomato-infused rice with mustard and curry leaf"),
        ("Saffron Kesar Pulao", 175, "Premium saffron-dyed basmati with pistachios and raisins"),
    ],

    # ── DAL ────────────────────────────────────
    "dal": [
        ("Dal Makhani", 180, "Slow-cooked black lentils in rich tomato-butter-cream sauce"),
        ("Dal Tadka", 150, "Yellow lentils tempered with ghee, garlic and cumin"),
        ("Dal Fry", 150, "Pan-fried lentils with onion, tomato and bold spices"),
        ("Moong Dal", 130, "Light yellow moong dal with a simple aromatic tadka"),
        ("Masoor Dal", 130, "Pink lentils in a thin tangy tomato-based curry"),
        ("Chana Dal", 140, "Split chickpea dal cooked with ginger and mild spices"),
        ("Panchratna Dal", 160, "Five lentils slow-cooked together in a rich gravy"),
        ("Amti", 140, "Maharashtrian kokum-spiked tangy-sweet dal"),
        ("Daal Baati (2+1 bowl)", 200, "Two baked baati served with piping hot panchratna dal"),
        ("Dal Khichdi", 140, "Comfort rice-moong dal porridge with ghee and jeera"),
    ],

    # ── KHICHDI ───────────────────────────────
    "khichdi": [
        ("Dal Khichdi", 140, "Comforting rice-moong dal porridge seasoned with jeera and ghee"),
        ("Sabudana Khichdi", 120, "Fasting-friendly tapioca pearls with peanuts and cumin"),
        ("Bajra Khichdi", 130, "Nourishing pearl millet khichdi with moong dal"),
        ("Oats Khichdi", 130, "Healthy quick oats and moong dal khichdi with veggies"),
        ("Masala Khichdi", 150, "Spiced-up khichdi with tomato, onion and goda masala"),
        ("Moong Dal Khichdi", 130, "Simple light moong dal khichdi — easily digestible"),
        ("Vegetable Khichdi", 150, "Khichdi loaded with seasonal vegetables and ghee"),
        ("Toor Dal Khichdi", 140, "Pigeon pea khichdi cooked with turmeric and coriander"),
        ("Khichdi Kadhi Combo", 200, "Classic pairing of khichdi with tangy Gujarati kadhi"),
        ("Brown Rice Khichdi", 150, "Nutritious brown rice khichdi with moong dal and herbs"),
    ],

    # ── DESSERTS ──────────────────────────────
    "desserts": [
        ("Gulab Jamun (2 pcs)", 80, "Soft khoya dumplings soaked in warm rose sugar syrup"),
        ("Rasgulla (2 pcs)", 80, "Spongy cottage cheese balls in light sugar syrup"),
        ("Rabri", 90, "Slowly reduced sweetened milk with saffron and cardamom"),
        ("Halwa (Sooji)", 80, "Warm semolina halwa with cashews, raisins and cardamom ghee"),
        ("Moong Dal Halwa", 120, "Rich slow-roasted moong dal dessert — a winter classic"),
        ("Gajar Ka Halwa", 110, "Sweet carrot pudding with khoya, ghee and cardamom"),
        ("Shahi Tukda", 120, "Fried bread soaked in saffron milk and topped with rabri"),
        ("Phirni", 90, "Rice flour milk pudding set in an earthen cup with saffron"),
        ("Kheer (Rice)", 90, "Creamy slow-cooked rice pudding with cardamom and pistachios"),
        ("Basundi", 90, "Reduced sweetened milk dessert with almond and saffron"),
        ("Kulfi (Malai)", 80, "Dense frozen milk dessert with cardamom and pistachio"),
        ("Malpua (2 pcs)", 90, "Deep-fried pancakes soaked in sugar syrup with fennel seeds"),
    ],

    # ── ICE CREAM ─────────────────────────────
    "ice_cream": [
        ("Vanilla Ice Cream (2 scoops)", 80, "Classic creamy vanilla ice cream with fresh cream"),
        ("Chocolate Ice Cream (2 scoops)", 90, "Rich dark chocolate ice cream with a velvety texture"),
        ("Strawberry Ice Cream (2 scoops)", 85, "Fresh strawberry-flavoured ice cream with fruit bits"),
        ("Mango Ice Cream (2 scoops)", 90, "Alphonso mango pulp ice cream — pure summer joy"),
        ("Kesar Pista Ice Cream (2 scoops)", 100, "Saffron and pistachio ice cream in a classic Indian style"),
        ("Butterscotch Ice Cream (2 scoops)", 90, "Smooth ice cream with sweet butterscotch chips"),
        ("Black Currant Ice Cream (2 scoops)", 90, "Purple-hued black currant ice cream with berry swirls"),
        ("Ice Cream Sundae", 130, "Three scoops with hot fudge sauce, whipped cream and cherry"),
        ("Ice Cream Sandwich", 80, "Scoop of ice cream between two soft cookies"),
        ("Ice Cream Waffle Cone", 90, "Two scoops in a freshly baked crunchy waffle cone"),
        ("Banana Split", 150, "Banana halves with three scoops, chocolate sauce and nuts"),
        ("Veg Ice Cream Platter", 250, "Five signature flavours served on a grand sharing platter"),
    ],

    # ── SWEETS ────────────────────────────────
    "sweets": [
        ("Kaju Katli (100g)", 120, "Diamond-shaped cashew fudge with a thin silver leaf"),
        ("Besan Ladoo (2 pcs)", 80, "Roasted gram flour balls with ghee, cardamom and sugar"),
        ("Motichoor Ladoo (2 pcs)", 80, "Tiny boondi pearls rolled into delicate laddus"),
        ("Burfi (Mixed, 100g)", 100, "Assorted milk-based Indian fudge in four flavours"),
        ("Rasgulla (2 pcs)", 80, "Spongy chenna balls in a light sugar syrup"),
        ("Gulab Jamun (2 pcs)", 80, "Khoya dumplings in warm rose-scented sugar syrup"),
        ("Halwa Platter", 150, "Trio of sooji, gajar and moong dal halwa with garnish"),
        ("Jalebi (100g)", 70, "Crispy deep-fried spirals soaked in saffron sugar syrup"),
        ("Imarti (2 pcs)", 90, "Urad dal flower-shaped deep-fried sweet soaked in syrup"),
        ("Barfi Sandwich", 100, "Layered fudge with pistachio, saffron and plain barfi"),
        ("Mysore Pak (100g)", 110, "Ghee-rich gram flour sweet from Karnataka"),
        ("Peda (2 pcs)", 70, "Soft round milk-based sweet with cardamom"),
        ("Coconut Barfi (100g)", 90, "Sweet dense coconut fudge with cardamom and rose water"),
    ],

    # ── JAIN FOOD ─────────────────────────────
    "jain": [
        ("Jain Pav Bhaji", 120, "Pav bhaji without potato, onion or garlic — Jain-certified"),
        ("Jain Daal Baati", 220, "Baked wheat balls with Jain-style dal without root vegetables"),
        ("Jain Thali", 280, "Complete Jain meal — dal, sabzi, roti, rice, papad, sweet"),
        ("Jain Paneer Butter Masala", 220, "Paneer in tomato-cashew sauce without garlic or onion"),
        ("Jain Chole", 140, "Chickpea curry made without onion, garlic and root veggies"),
        ("Jain Biryani", 190, "Aromatic layered rice with permitted Jain vegetables"),
        ("Jain Kadhi", 120, "Yoghurt-based kadhi without onion and garlic"),
        ("Jain Pizza", 195, "No-onion no-garlic pizza with tomato sauce and cheese"),
        ("Jain Chinese (Manchurian)", 180, "Veg Manchurian made strictly Jain — no onion/garlic"),
        ("Jain Pasta", 170, "Pasta in tomato basil sauce without garlic or onion"),
        ("Jain Sandwich", 100, "Veggie sandwich made with Jain-approved ingredients only"),
        ("Jain Misal Pav", 110, "Jain-style misal without onion with lemon and farsan"),
    ],

    # ── WAFFLES ───────────────────────────────
    "waffles": [
        ("Classic Belgian Waffle", 130, "Light crispy waffle with powdered sugar and maple syrup"),
        ("Chocolate Overload Waffle", 160, "Waffle topped with hot chocolate fudge and cocoa powder"),
        ("Strawberry Waffle", 150, "Crispy waffle with fresh strawberry coulis and cream"),
        ("Nutella Waffle", 160, "Warm waffle spread with Nutella and crushed hazelnuts"),
        ("Banana Waffle", 150, "Caramelised banana slices atop golden crispy waffle"),
        ("Mixed Berry Waffle", 160, "Waffle with blueberry, raspberry and strawberry compote"),
        ("Tiramisu Waffle", 175, "Espresso-soaked waffle topped with mascarpone cream"),
        ("Lotus Biscoff Waffle", 170, "Waffle drizzled with Biscoff spread and caramel sauce"),
        ("Peanut Butter Waffle", 155, "Crispy waffle loaded with peanut butter and honey"),
        ("Ice Cream Waffle", 180, "Hot waffle served with two scoops of ice cream"),
        ("Red Velvet Waffle", 170, "Vibrant red batter waffle with cream cheese frosting"),
        ("Savoury Herb Waffle", 120, "Crispy herb waffle with cheese dip and tomato salsa"),
    ],

    # ── CAKE ──────────────────────────────────
    "cake": [
        ("Chocolate Truffle Cake (Slice)", 90, "Decadent dark chocolate ganache cake with cocoa sponge"),
        ("Red Velvet Cake (Slice)", 90, "Velvety red sponge with tangy cream cheese frosting"),
        ("Black Forest Cake (Slice)", 85, "Chocolate sponge with cherries, cream and chocolate shavings"),
        ("Vanilla Sponge Cake (Slice)", 75, "Light fluffy vanilla cake with fresh cream frosting"),
        ("Lemon Blueberry Cake (Slice)", 90, "Zesty lemon cake with juicy blueberry compote"),
        ("Carrot Walnut Cake (Slice)", 90, "Moist carrot cake with walnuts and cream cheese icing"),
        ("Pineapple Cake (Slice)", 80, "Classic pineapple pastry with cream and cherry on top"),
        ("Mango Mousse Cake (Slice)", 100, "Alphonso mango mousse layered on a biscuit base"),
        ("Oreo Cake (Slice)", 95, "Chocolate sponge layered with Oreo cream frosting"),
        ("Whole Chocolate Cake (500g)", 550, "A full 500g celebration chocolate cake"),
        ("Whole Red Velvet Cake (500g)", 580, "Full red velvet celebration cake with cream cheese frost"),
        ("Cupcake (Single)", 60, "Soft cupcake with swirled buttercream in seasonal flavours"),
    ],

    # ── CHEESECAKE ────────────────────────────
    "cheesecake": [
        ("Classic New York Cheesecake (Slice)", 130, "Dense creamy cheesecake on a graham cracker base"),
        ("Strawberry Cheesecake (Slice)", 140, "Vanilla cheesecake topped with fresh strawberry glaze"),
        ("Blueberry Cheesecake (Slice)", 140, "Cream cheese filling with a luscious blueberry compote"),
        ("Chocolate Cheesecake (Slice)", 145, "Rich dark chocolate base with creamy cheesecake layer"),
        ("Baked Caramel Cheesecake (Slice)", 150, "Slow-baked cheesecake with salted caramel drizzle"),
        ("No-Bake Mango Cheesecake (Slice)", 140, "Chilled mango cheesecake with Alphonso pulp topping"),
        ("Lotus Biscoff Cheesecake (Slice)", 155, "Biscoff-spiced cream cheese on a caramel crumb base"),
        ("Oreo Cheesecake (Slice)", 145, "Oreo-studded cheesecake on a crushed Oreo crust"),
        ("Lemon Tart Cheesecake (Slice)", 140, "Zesty lemon cream cheese in a buttery pastry shell"),
        ("Matcha Cheesecake (Slice)", 150, "Japanese matcha-flavoured cream cheese on a hazelnut base"),
        ("Mini Cheesecake Trio", 200, "Three mini cheesecakes in strawberry, chocolate and mango"),
    ],

    # ── DOUGHNUT ──────────────────────────────
    "doughnut": [
        ("Glazed Ring Doughnut", 60, "Classic yeasted ring doughnut with a sweet sugar glaze"),
        ("Chocolate Doughnut", 70, "Fluffy doughnut with chocolate glaze and sprinkles"),
        ("Strawberry Frosted Doughnut", 70, "Ring doughnut with pink strawberry icing and jimmies"),
        ("Cinnamon Sugar Doughnut", 65, "Rolled in warm cinnamon sugar — simple yet irresistible"),
        ("Nutella Filled Doughnut", 80, "Soft ball doughnut stuffed with Nutella and dusted icing sugar"),
        ("Custard Cream Doughnut", 75, "Pillow-soft doughnut filled with vanilla custard cream"),
        ("Blueberry Glazed Doughnut", 75, "Light doughnut with sweet blueberry glaze and drizzle"),
        ("Matcha Glazed Doughnut", 80, "Yeast doughnut with a vibrant Japanese matcha glaze"),
        ("Lotus Biscoff Doughnut", 85, "Filled with Biscoff cream and topped with crumbled cookie"),
        ("Mixed Doughnut Box (6 pcs)", 360, "Six assorted flavoured doughnuts in a gift-worthy box"),
    ],

    # ── SUNDAE ────────────────────────────────
    "sundae": [
        ("Hot Fudge Sundae", 130, "Vanilla ice cream with warm chocolate fudge and whipped cream"),
        ("Brownie Sundae", 160, "Warm fudgy brownie topped with ice cream and caramel sauce"),
        ("Strawberry Sundae", 130, "Strawberry ice cream with fresh berry coulis and cream"),
        ("Banana Caramel Sundae", 140, "Scoops with caramelised banana, caramel sauce and nuts"),
        ("Oreo Sundae", 145, "Vanilla ice cream layered with crushed Oreos and chocolate"),
        ("Kesar Mango Sundae", 150, "Mango ice cream with saffron-infused rabri and pistachios"),
        ("Rocky Road Sundae", 155, "Chocolate ice cream with marshmallow, nuts and chocolate syrup"),
        ("Lotus Sundae", 155, "Biscoff ice cream with caramel sauce and cookie crumble"),
        ("Cotton Candy Sundae", 150, "Pastel ice cream with fairy floss and fruit pearls"),
        ("Grand Sundae Platter", 280, "Four scoops, three sauces, wafer rolls and fresh fruit"),
    ],

    # ── KULFI ─────────────────────────────────
    "kulfi": [
        ("Malai Kulfi", 80, "Creamy dense frozen dessert with cardamom and pistachio"),
        ("Mango Kulfi", 90, "Alphonso mango kulfi — intensely fruity and thick"),
        ("Kesar Pista Kulfi", 95, "Saffron and pistachio kulfi with rose water hint"),
        ("Rose Kulfi", 85, "Floral rose-flavoured kulfi with petals and almonds"),
        ("Kulfi Falooda", 140, "Kulfi on a bed of falooda noodles, basil seeds and rose syrup"),
        ("Matka Kulfi (2 pcs)", 100, "Earthen pot kulfi with classic malai flavour"),
        ("Chocolate Kulfi", 90, "Dark chocolate dipped or flavoured frozen kulfi bar"),
        ("Strawberry Kulfi", 90, "Fresh strawberry kulfi with fruit bits"),
        ("Rabri Kulfi", 100, "Kulfi served drizzled with saffron-scented rabri"),
        ("Sitaphal (Custard Apple) Kulfi", 100, "Seasonal sitaphal kulfi — limited availability"),
    ],

    # ── BROWNIE ───────────────────────────────
    "brownie": [
        ("Classic Fudge Brownie", 80, "Dense dark chocolate fudgy brownie with walnut"),
        ("Nutella Brownie", 90, "Brownie swirled with Nutella and topped with hazelnuts"),
        ("Cheesecake Brownie", 100, "Fudge brownie with a cream cheese swirl on top"),
        ("Peanut Butter Brownie", 90, "Chocolate brownie with a thick peanut butter ripple"),
        ("Salted Caramel Brownie", 95, "Gooey caramel-topped dark brownie with sea salt flakes"),
        ("Triple Chocolate Brownie", 100, "White, milk and dark chocolate chunks in one brownie"),
        ("Red Velvet Brownie", 90, "Red velvet twist on the classic fudge brownie"),
        ("Brownie Hot Chocolate", 130, "A thick warm brownie bites in a mug of rich hot chocolate"),
        ("Brownie à la Mode", 150, "Warm brownie with a scoop of vanilla ice cream on top"),
        ("Brownie Platter (4 pcs)", 300, "Four assorted brownies — perfect for sharing"),
    ],

    # ── TIRAMISU ──────────────────────────────
    "tiramisu": [
        ("Classic Tiramisu", 130, "Espresso-soaked ladyfingers with mascarpone and cocoa powder"),
        ("Mango Tiramisu", 140, "Tropical twist with Alphonso mango and mascarpone cream"),
        ("Strawberry Tiramisu", 140, "Fresh strawberry layered tiramisu with light cream"),
        ("Chocolate Tiramisu", 140, "Double chocolate tiramisu with dark ganache and espresso"),
        ("Hazelnut Tiramisu", 145, "Nutella-hazelnut flavoured tiramisu with gianduja cream"),
        ("Matcha Tiramisu", 145, "Japanese green tea version with ceremonial matcha dusting"),
        ("Lotus Tiramisu", 150, "Biscoff-flavoured tiramisu with caramel layers"),
        ("Tiramisu Waffles", 175, "Espresso waffle topped with mascarpone cream and cocoa"),
        ("Tiramisu Cake (Slice)", 160, "Classic tiramisu served as a layered sliceable cake"),
        ("Mini Tiramisu Cups (3 pcs)", 170, "Three individual bite-sized tiramisu cups"),
    ],

    # ── PASTRY ────────────────────────────────
    "pastry": [
        ("Éclair (Chocolate)", 80, "Choux pastry filled with vanilla cream and chocolate glaze"),
        ("Croissant (Plain)", 70, "Buttery flaky French croissant with layers of golden pastry"),
        ("Almond Croissant", 90, "Croissant filled with sweet almond frangipane cream"),
        ("Danish Pastry", 90, "Flaky Danish roll with fruit filling or cinnamon streusel"),
        ("Fruit Tart", 110, "Shortcrust pastry shell with custard and seasonal fresh fruits"),
        ("Napoleon Mille-Feuille", 120, "Crispy puff pastry layered with vanilla custard cream"),
        ("Pain au Chocolat", 90, "Chocolate-stuffed buttery puff pastry roll"),
        ("Cinnamon Roll", 90, "Soft swirled bread bun with cinnamon sugar and cream cheese glaze"),
        ("Apple Strudel", 100, "Thin pastry rolled with cinnamon spiced apple filling"),
        ("Choco Lava Pastry", 120, "Mini molten chocolate cake with flowing lava centre"),
        ("Strawberry Shortcake", 110, "Light sponge with fresh strawberries and whipped cream"),
    ],

    # ── RASGULLA SHAKE ────────────────────────
    "rasgulla_shake": [
        ("Rasgulla Shake", 120, "Thick milkshake blended with soft rasgulla and cardamom"),
        ("Rose Rasgulla Shake", 130, "Rasgulla shake with rose syrup and gulkand swirl"),
        ("Kesar Rasgulla Shake", 130, "Saffron-infused rasgulla milkshake with pistachios"),
        ("Mango Rasgulla Shake", 130, "Alphonso mango blend with soft rasgulla chunks"),
        ("Chocolate Rasgulla Shake", 130, "Dark chocolate milkshake with rasgulla floating inside"),
        ("Vanilla Rasgulla Shake", 120, "Classic vanilla shake with soft rasgulla bites"),
        ("Strawberry Rasgulla Shake", 130, "Fresh strawberry shake with cold sweet rasgulla"),
        ("Rasmalai Shake", 130, "Saffron-scented shake made with creamy rasmalai"),
        ("Gulab Jamun Shake", 120, "Thick shake blended with soft gulab jamun pieces"),
        ("Basundi Shake", 130, "Creamy thick shake made with saffron basundi"),
    ],

    # ── SOUP ──────────────────────────────────
    "soup": [
        ("Tomato Soup", 90, "Warm blended tomato soup with fresh cream and basil"),
        ("Sweet Corn Soup", 100, "Thick corn chowder with vegetable broth and white pepper"),
        ("Hot & Sour Soup", 100, "Tangy spicy Chinese-style vegetable broth with vinegar"),
        ("Lemon Coriander Soup", 90, "Refreshing clear broth with lemon, coriander and vegetables"),
        ("Mushroom Cream Soup", 110, "Velvety roasted mushroom soup with fresh cream swirl"),
        ("Pumpkin Soup", 100, "Sweet roasted pumpkin blended with coconut milk and spices"),
        ("Manchow Soup", 100, "Thick Indo-Chinese soup topped with crispy fried noodles"),
        ("Spinach & Corn Soup", 100, "Nutritious spinach blend with sweet corn and ginger"),
        ("Broccoli Cheddar Soup", 115, "Creamy broccoli soup loaded with sharp cheddar cheese"),
        ("Minestrone Soup", 110, "Italian-style vegetable and pasta soup in tomato broth"),
        ("Shorba (Indian Broth)", 90, "Spiced clear Indian broth with cloves and coriander"),
        ("Noodle Veg Soup", 100, "Clear broth with vegetables and soft rice noodles"),
    ],

    # ── MANCHURIAN ────────────────────────────
    "manchurian": [
        ("Veg Manchurian Gravy", 180, "Fried mixed vegetable dumplings in tangy Indo-Chinese sauce"),
        ("Veg Manchurian Dry", 165, "Crispy veggie balls tossed in a sticky garlic-soy sauce"),
        ("Gobi Manchurian Dry", 160, "Crispy cauliflower in sweet-tangy Manchurian sauce"),
        ("Gobi Manchurian Gravy", 170, "Cauliflower in thick Indo-Chinese gravy sauce"),
        ("Paneer Manchurian", 200, "Crispy fried paneer in a savoury Manchurian sauce"),
        ("Mushroom Manchurian", 190, "Button mushrooms in a tangy Indo-Chinese sauce"),
        ("Baby Corn Manchurian", 180, "Crispy baby corn in a spicy-tangy Manchurian coating"),
        ("Soya Manchurian", 185, "Fried soya chunks tossed in a dark soy-garlic sauce"),
        ("Tofu Manchurian", 185, "Pan-fried tofu in Manchurian gravy with spring onion"),
        ("Combo Manchurian (Dry+Rice)", 260, "Veg Manchurian dry paired with Schezwan fried rice"),
    ],

    # ── VADA PAV ──────────────────────────────
    "vada_pav": [
        ("Classic Vada Pav", 30, "Mumbai's street king — spiced potato vada in a soft pav"),
        ("Cheese Vada Pav", 50, "Melted cheese added to the classic vada pav for indulgence"),
        ("Schezwan Vada Pav", 45, "Vada pav with spicy Schezwan sauce spread"),
        ("Garlic Vada Pav", 35, "Classic vada pav with extra dry roasted garlic chutney"),
        ("Jain Vada Pav", 35, "Vada pav without garlic and onion — Jain-friendly version"),
        ("Crispy Vada Pav", 40, "Double-fried vada for an extra-crunchy golden texture"),
        ("Mini Vada Pav (4 pcs)", 80, "Four bite-sized vada pavs — perfect tea-time snack"),
        ("Vada Pav with Kadhi", 60, "Comforting combo of vada pav served with hot kadhi"),
        ("Loaded Vada Pav", 65, "Vada with triple chutney, cheese and crispy sev"),
        ("Anda-less Vada Pav Combo", 70, "Vada pav with masala chai — the ultimate Mumbai experience"),
    ],
}

# ─────────────────────────────────────────────
#  CUISINE TAG → DISH BANK KEYS  (for menu building)
# ─────────────────────────────────────────────
CUISINE_DISH_MAP = {
    "All":            list(DISH_BANK.keys()),
    "Deserts":        ["desserts", "cake", "cheesecake", "brownie", "tiramisu", "pastry"],
    "North Indian":   ["north_indian", "dal", "paneer", "paratha", "kulche", "chole", "pulao"],
    "Ice Cream":      ["ice_cream", "sundae", "kulfi"],
    "Pav Bhaji":      ["pav_bhaji", "maharashtrian"],
    "Sweets":         ["sweets", "desserts"],
    "Jain Food":      ["jain", "north_indian", "dal"],
    "South Indian":   ["south_indian", "dosa", "idli", "vada"],
    "Waffles":        ["waffles", "desserts"],
    "Maharashtrian":  ["maharashtrian", "vada_pav", "pav_bhaji"],
    "Paneer":         ["paneer", "north_indian"],
    "Sandwich":       ["sandwich", "rolls"],
    "Cake":           ["cake", "cheesecake", "pastry"],
    "Dosa":           ["dosa", "south_indian"],
    "Chinese":        ["chinese", "manchurian", "fried_rice", "soup"],
    "Fried Rice":     ["fried_rice", "chinese"],
    "Pizza":          ["pizza", "sandwich"],
    # ── dropdown cuisines ──
    "Kulfi":          ["kulfi", "ice_cream"],
    "Khichdi":        ["khichdi", "dal"],
    "Gujarati":       ["gujarati", "thali"],
    "Pastry":         ["pastry", "cake"],
    "Thali":          ["thali", "north_indian", "gujarati", "rajasthani"],
    "Chaap":          ["chaap", "north_indian", "paneer"],
    "Rajasthani":     ["rajasthani", "thali"],
    "Chaat":          ["chaat", "samosa", "vada_pav"],
    "Idli":           ["idli", "south_indian"],
    "Dal":            ["dal", "north_indian", "khichdi"],
    "Rolls":          ["rolls", "sandwich", "chaap"],
    "Dal Khichdi":    ["khichdi", "dal"],
    "Vada":           ["vada", "south_indian"],
    "Kulche":         ["kulche", "north_indian"],
    "Paratha":        ["paratha", "aloo_paratha"],
    "Cheesecake":     ["cheesecake", "cake"],
    "Doughnut":       ["doughnut", "desserts"],
    "Sundae":         ["sundae", "ice_cream"],
    "Pulao":          ["pulao", "north_indian"],
    "Chole":          ["chole", "chole_bhature"],
    "Tiramisu":       ["tiramisu", "desserts"],
    "Rasgulla Shake": ["rasgulla_shake", "sweets"],
    "Brownie":        ["brownie", "cake"],
    "Manchurian":     ["manchurian", "chinese"],
    "Soup":           ["soup", "chinese"],
    "Chole Bhature":  ["chole_bhature", "chole"],
    "Vada Pav":       ["vada_pav", "maharashtrian"],
    "Samosa":         ["samosa", "chaat"],
    "Aloo Paratha":   ["aloo_paratha", "paratha"],
}

ALL_CUISINE_TAGS = list(CUISINE_DISH_MAP.keys())

# ─────────────────────────────────────────────
#  NAME PARTS FOR REALISTIC RESTAURANT NAMES
# ─────────────────────────────────────────────
NAME_PREFIXES = [
    "Shree", "Sai", "Annapurna", "Amrut", "Roshan", "Swad", "Sukh",
    "Dev", "Ganesh", "Lakshmi", "Saraswati", "Vishnu", "Krishna", "Ram",
    "Jai", "Mata", "Prabhu", "Om", "Bharat", "Ganga", "Tulsi", "Nandan",
    "Vrindavan", "Govind", "Mangal", "Shubham", "Prasad", "Mahavir",
    "Parshwa", "Ambica", "Amba", "Durga", "Balaji", "Tirupati", "Venkatesh",
    "Vitthal", "Pandurang", "Datta", "Dattatrey", "Maruti",
]

NAME_MAINS = [
    "Bhojanalaya", "Upahar", "Bhojanshala", "Kitchen", "Eatery", "Corner",
    "Dhaba", "House", "Rasoi", "Bhavan", "Pure Veg", "Tadka", "Swaad",
    "Flavours", "Zaika", "Spice Garden", "Aangan", "Chowk", "Tiffin",
    "Bites", "Treats", "Point", "Express", "Palace", "Garden", "Village",
    "Heritage", "Treats", "Hub", "Nest", "Dine", "Khana", "Darbar",
    "Mahal", "Vatika", "Kutir", "Thali", "Mandir", "Seva",
]

SPECIALTY_NAMES = [
    "{loc} Veg Delights", "{loc} Pure Veg", "The Veg Spot {loc}", "{loc} Tiffin House",
    "Mumbai Rasoi {loc}", "{loc} Swad", "Green Leaf {loc}", "No Onion No Garlic {loc}",
    "Satvik {loc}", "The Pure Plate {loc}", "Veg Adda {loc}", "Desi Kitchen {loc}",
    "{loc} Food Court", "Family Thali {loc}", "Annapurna {loc}", "Homestyle {loc}",
    "{loc} Bhojanalaya", "Veg Junction {loc}", "Pure Spice {loc}", "Rasoi Ghar {loc}",
    "Trupti {loc}", "Sattvik {loc}", "Green Bowl {loc}", "Niraamish {loc}",
    "Veg Binge {loc}", "The Punjabi {loc}", "South Star {loc}", "Ghar Ka Swad {loc}",
    "Desi Tadka {loc}", "Veg Nation {loc}",
]

# ─────────────────────────────────────────────
#  HELPER FUNCTIONS
# ─────────────────────────────────────────────

def generate_restaurant_name(location: str) -> str:
    """Generate a realistic Indian pure-veg restaurant name."""
    style = random.choice(["prefix_main", "specialty"])
    if style == "prefix_main":
        prefix = random.choice(NAME_PREFIXES)
        main = random.choice(NAME_MAINS)
        # Optionally append locality
        if random.random() < 0.4:
            return f"{prefix} {main} - {location}"
        return f"{prefix} {main}"
    else:
        template = random.choice(SPECIALTY_NAMES)
        return template.replace("{loc}", location)


def build_menu(primary_cuisine_tag: str, num_dishes: int = None) -> list:
    """
    Build a menu of 10-15 dishes for a restaurant.
    Always draw from the primary cuisine's dish banks, then supplement from others.
    """
    if num_dishes is None:
        num_dishes = random.randint(10, 15)

    # Get relevant dish bank keys
    primary_keys = CUISINE_DISH_MAP.get(primary_cuisine_tag, ["north_indian"])
    # Flatten dishes from primary keys
    primary_dishes = []
    for key in primary_keys:
        primary_dishes.extend(DISH_BANK.get(key, []))

    # Deduplicate
    seen = set()
    unique_primary = []
    for d in primary_dishes:
        if d[0] not in seen:
            seen.add(d[0])
            unique_primary.append(d)

    # Shuffle and pick
    random.shuffle(unique_primary)
    selected = unique_primary[:num_dishes]

    # If not enough, supplement from other categories
    if len(selected) < num_dishes:
        filler_keys = random.sample([k for k in DISH_BANK if k not in primary_keys],
                                    min(3, len(DISH_BANK) - len(primary_keys)))
        filler_dishes = []
        for key in filler_keys:
            filler_dishes.extend(DISH_BANK[key])
        random.shuffle(filler_dishes)
        for d in filler_dishes:
            if d[0] not in seen and len(selected) < num_dishes:
                seen.add(d[0])
                selected.append(d)

    # Build menu items with slight price variation
    menu = []
    for name, base_price, desc in selected:
        # Add ±10% price variation for realism
        variation = random.uniform(0.90, 1.10)
        price = round(base_price * variation / 5) * 5  # round to nearest 5
        price = max(20, price)  # minimum ₹20
        menu.append({
            "name": name,
            "price": price,
            "description": desc,
            "is_veg": True,
        })

    return menu


def generate_rating() -> float:
    """Generate a realistic restaurant rating skewed towards 3.5-4.5."""
    return round(random.triangular(3.0, 5.0, 4.2), 1)


def generate_review_count() -> int:
    """Generate a realistic review count."""
    return random.choice([
        random.randint(50, 200),
        random.randint(200, 800),
        random.randint(800, 3000),
        random.randint(3000, 8000),
    ])


def generate_delivery_time() -> str:
    """Realistic Mumbai delivery time."""
    mins = random.choice([20, 25, 30, 35, 40, 45, 50])
    return f"{mins}-{mins + 10} mins"


def generate_cost_for_two() -> int:
    """Average cost for two."""
    return random.choice([100, 150, 200, 250, 300, 350, 400, 450, 500])

# ─────────────────────────────────────────────
#  CUISINE DISTRIBUTION — 700-800 restaurants
#  Each cuisine must have ≥ 10 restaurants
# ─────────────────────────────────────────────

CUISINE_DISTRIBUTION = {
    "North Indian":   45,
    "South Indian":   40,
    "Maharashtrian":  40,
    "Gujarati":       30,
    "Rajasthani":     20,
    "Chinese":        35,
    "Fried Rice":     20,
    "Pizza":          20,
    "Pav Bhaji":      25,
    "Sandwich":       20,
    "Chaat":          25,
    "Chole Bhature":  20,
    "Thali":          25,
    "Paratha":        20,
    "Kulche":         15,
    "Rolls":          20,
    "Chaap":          15,
    "Paneer":         20,
    "Dosa":           25,
    "Idli":           15,
    "Vada":           15,
    "Samosa":         15,
    "Aloo Paratha":   15,
    "Chole":          15,
    "Pulao":          15,
    "Dal":            15,
    "Khichdi":        10,
    "Kulfi":          10,
    "Ice Cream":      20,
    "Sweets":         20,
    "Deserts":        20,
    "Cake":           15,
    "Cheesecake":     10,
    "Doughnut":       10,
    "Sundae":         10,
    "Waffles":        15,
    "Brownie":        10,
    "Tiramisu":       10,
    "Pastry":         10,
    "Rasgulla Shake": 10,
    "Manchurian":     15,
    "Soup":           10,
    "Vada Pav":       20,
    "Jain Food":      15,
    "Dal Khichdi":    10,
}

# ─────────────────────────────────────────────
#  MAIN GENERATOR
# ─────────────────────────────────────────────

def generate_all_restaurants() -> list:
    restaurants = []
    used_names = set()
    restaurant_id = 1

    for cuisine_tag, count in CUISINE_DISTRIBUTION.items():
        for _ in range(count):
            location = random.choice(MUMBAI_LOCATIONS)

            # Keep trying until unique name
            for attempt in range(20):
                name = generate_restaurant_name(location)
                if name not in used_names:
                    used_names.add(name)
                    break
            else:
                name = f"Veg House #{restaurant_id} {location}"
                used_names.add(name)

            menu = build_menu(cuisine_tag)

            # Assign multiple cuisine tags (primary + 1-2 secondary)
            secondary = [t for t in ALL_CUISINE_TAGS
                         if t != cuisine_tag and t != "All"]
            # Pick 1-3 random secondary tags
            extra_tags = random.sample(secondary, min(random.randint(1, 3), len(secondary)))
            all_tags = [cuisine_tag] + extra_tags

            restaurant = {
                "id": restaurant_id,
                "name": name,
                "pure_veg": True,
                "location": location,
                "city": "Mumbai",
                "cuisines": all_tags,
                "primary_cuisine": cuisine_tag,
                "rating": generate_rating(),
                "total_ratings": generate_review_count(),
                "delivery_time": generate_delivery_time(),
                "cost_for_two": generate_cost_for_two(),
                "is_open": random.random() > 0.08,  # 92% open
                "menu": menu,
            }

            restaurants.append(restaurant)
            restaurant_id += 1

    random.shuffle(restaurants)
    # Re-assign sequential IDs after shuffle
    for i, r in enumerate(restaurants, 1):
        r["id"] = i

    return restaurants


# ─────────────────────────────────────────────
#  RUN & SAVE
# ─────────────────────────────────────────────

if __name__ == "__main__":
    print("⏳ Generating Zesty Mumbai restaurant data...")
    data = generate_all_restaurants()
    total = len(data)

    # Verify cuisine coverage
    from collections import defaultdict
    coverage = defaultdict(int)
    for r in data:
        coverage[r["primary_cuisine"]] += 1

    print(f"\n✅ Total restaurants generated: {total}")
    print(f"\n📊 Cuisine breakdown (primary cuisine):")
    for cuisine, cnt in sorted(coverage.items(), key=lambda x: -x[1]):
        print(f"   {cuisine:<25} {cnt:>4} restaurants")

    # Menu stats
    menu_sizes = [len(r["menu"]) for r in data]
    print(f"\n🍽️  Menu stats:")
    print(f"   Min dishes per restaurant : {min(menu_sizes)}")
    print(f"   Max dishes per restaurant : {max(menu_sizes)}")
    print(f"   Avg dishes per restaurant : {sum(menu_sizes)/len(menu_sizes):.1f}")

    # Save to JSON
    output_path = "zesty_mumbai_restaurants.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"\n💾 Data saved to: {output_path}")
    print(f"   File contains {total} restaurants across Mumbai.")

    # Print a sample restaurant
    sample = random.choice(data)
    print(f"\n🔍 Sample Restaurant:")
    print(f"   Name          : {sample['name']}")
    print(f"   Location      : {sample['location']}")
    print(f"   Primary Cuisine: {sample['primary_cuisine']}")
    print(f"   All Cuisines  : {', '.join(sample['cuisines'])}")
    print(f"   Rating        : {sample['rating']} ⭐ ({sample['total_ratings']} ratings)")
    print(f"   Delivery Time : {sample['delivery_time']}")
    print(f"   Cost for Two  : ₹{sample['cost_for_two']}")
    print(f"   Menu ({len(sample['menu'])} items):")
    for item in sample['menu'][:5]:
        print(f"      • {item['name']} — ₹{item['price']}")
        print(f"        {item['description']}")
    print(f"      ... and {len(sample['menu'])-5} more items")
