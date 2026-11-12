"""
Comprehensive 5,000-Sample Dataset Generator for UrbanPulse Priority Service.
Generates realistic, diverse civic complaint reports with varied sentence structures,
local context, realistic phrasing, edge cases, and calibrated ground truth severity scores.
"""

import csv
import json
import random
from pathlib import Path

random.seed(42)

SERVICE_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = SERVICE_ROOT / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

OUTPUT_CSV = DATA_DIR / "priority_training_dataset_5000.csv"
OUTPUT_JSON = DATA_DIR / "priority_training_dataset_5000.json"

LANDMARKS = [
    "Near Civil Hospital Gate 2",
    "Opposite Central Bank & ATM",
    "Under Metro Pillar 142",
    "Adjacent to St. Xavier Primary School",
    "Near the corner tea stall & auto stand",
    "In front of House #54, Street 9",
    "Behind Sector 15 Community Center",
    "At the intersection of Ring Road and Main Bypass",
    "Near Old Subhash Vegetable Market",
    "Close to Railway Station Platform 1 Exit",
    "Next to Municipal Water Tank Pump Room",
    "Along Industrial Area Phase 2 Main Road",
    "Near Navin Nagar Bus Rapid Transit corridor",
    "Beside Gandhi Chowk Clock Tower",
    "Opposite Girls Higher Secondary School",
    "At the highway flyover slip road",
    "Near Children Park Southern Gate",
    "Behind District Court Complex",
    "Near Riverfront Promenade Walkway",
    "Outside Apollo Pharmacy on 10th Cross",
    "At Nehru Circle roundabout",
    "Near the Fire Station junction",
    "Opposite City Central Library",
    "Near Wholesale Grain Mandi gate",
    "Along Canal Link Road"
]

CITIZEN_VOICES = [
    "Please send a municipal team immediately.",
    "This has been ignored for over a week despite repeated calls.",
    "Children and senior citizens walk here every morning and evening.",
    "Already witnessed two minor accidents here yesterday.",
    "Traffic is getting completely backed up during rush hours.",
    "Extremely dangerous situation during night hours due to poor lighting.",
    "Foul smell and hazardous conditions making life miserable for residents.",
    "Ambulances and emergency vehicles are getting delayed.",
    "Urgent intervention requested from ward counselor.",
    "Please look into this before a major tragedy occurs.",
    "Kindly inspect and resolve this at the earliest.",
    "Daily commuters are facing extreme difficulty navigating this stretch.",
    "Residents of this colony request prompt repair action.",
    "Two-wheeler riders are skidding and falling frequently.",
    "Needs patching and clearing as soon as possible."
]

# Pothole templates across severity tiers
POTHOLE_TEMPLATES = [
    # LOW (Score ~15-30)
    {
        "tier": "LOW",
        "base_score": (15.0, 30.0),
        "titles": [
            "Minor surface wear on pavement",
            "Shallow asphalt chipping along curb lane",
            "Small hairline road crack developing",
            "Rough asphalt patch near residential colony entrance",
            "Minor depression in parking lane",
            "Slight road roughness near speed bump",
            "Small surface depression holding puddle after light drizzle"
        ],
        "descs": [
            "A few small surface cracks and slight bumps forming along the residential side lane. Does not impede traffic.",
            "Shallow pavement chipping about 1 inch deep along the side curb. Traffic moves normally.",
            "Small asphalt depression near the parking bay. No danger to moving vehicles, just needs preventive patching.",
            "Slight unevenness in the tarmac surface following recent cable laying. Vehicles can pass without issue.",
            "Minor peeling of the top bituminous layer along the colony boundary wall. No safety risk."
        ]
    },
    # MEDIUM (Score ~31-60)
    {
        "tier": "MEDIUM",
        "base_score": (35.0, 58.0),
        "titles": [
            "Multiple potholes along colony link road",
            "Series of bumpy potholes near market crossing",
            "Road hollow causing severe jarring to vehicles",
            "Unrepaired utility trench across residential street",
            "Cluster of medium potholes after monsoon rains",
            "Broken road surface near roundabout approach",
            "Uneven sinkage of road surface around storm drain cover"
        ],
        "descs": [
            "Series of 3 to 4 potholes making driving uncomfortable. Drivers have to slow down abruptly to avoid tire damage.",
            "Medium-sized road ditch about 4 to 6 inches deep causing traffic slowdown and rattling cars.",
            "The road was dug up for pipe repair 3 weeks ago and left unpaved with gravel scattered everywhere.",
            "Several depressions along the two-lane stretch making it difficult for two-wheelers and autos to maneuver smoothly.",
            "Sunken asphalt patch around the stormwater inspection chamber creating an uncomfortable drop for passing vehicles."
        ]
    },
    # HIGH (Score ~61-80)
    {
        "tier": "HIGH",
        "base_score": (62.0, 79.0),
        "titles": [
            "Deep crater on busy arterial road causing near-collisions",
            "Severe road damage causing bike accidents at night",
            "Massive pothole near highway junction causing tire blowouts",
            "Large deep pothole on high-speed flyover descent",
            "Dangerous submerged crater on main avenue after downpour",
            "Sharp broken asphalt edges tearing tires near school bus stop",
            "Huge crater right in the middle of heavy commercial corridor"
        ],
        "descs": [
            "Large crater nearly 1.5 feet deep right in the center lane. Vehicles are forced to swerve suddenly into oncoming traffic to avoid it.",
            "Deep pothole has already caused multiple two-wheelers to lose balance and crash after sunset. Extremely dangerous hazard.",
            "Multiple cars have suffered burst tires and bent wheel rims within the last 48 hours. Deep sharp-edged pothole on fast-moving road.",
            "Heavy crater hidden under muddy rain water. Motorcyclists cannot judge the depth and are thrown off their bikes.",
            "Massive crater near the bus transit terminal creating severe bottleneck and hazardous swerving for overloaded city buses."
        ]
    },
    # CRITICAL (Score ~81-98)
    {
        "tier": "CRITICAL",
        "base_score": (82.0, 97.0),
        "titles": [
            "Massive sinkhole opening up on main avenue - risk of road collapse",
            "Deep collapsed crater outside emergency hospital entrance blocking ambulances",
            "Missing iron manhole cover with open 10-foot shaft in unlit road",
            "Road caved in across both lanes near bridge approach",
            "Major structural asphalt collapse following sewer pipe burst",
            "Huge chasm swallowing vehicle wheels right outside school gate",
            "Catastrophic road cave-in on busy highway intersection"
        ],
        "descs": [
            "Huge sinkhole over 5 feet wide and 4 feet deep suddenly opened up. Imminent danger of vehicle falling in or complete road collapse!",
            "Severe road collapse directly blocking the emergency casualty entrance. Ambulances carrying critical patients are unable to pass safely.",
            "Heavy iron manhole frame broken and lid completely missing on a pitch dark road. Open deep sewer shaft is a fatal death trap for pedestrians and bikers!",
            "Roadway completely ruptured and caved in after underground drainage collapse. Both lanes blocked, severe danger to public life.",
            "Dangerous gaping cavity formed under the tarmac with hollow road crust. A truck wheel got trapped and roadway is crumbling further."
        ]
    }
]

# Streetlight templates
STREETLIGHT_TEMPLATES = [
    # LOW (Score ~12-28)
    {
        "tier": "LOW",
        "base_score": (12.0, 28.0),
        "titles": [
            "Street light bulb dim in residential lane",
            "Streetlight timer on during daylight hours",
            "Plastic access cover flap unlatched on lamp post",
            "Flickering lamp post in quiet dead-end alley",
            "Tree foliage slightly shading decorative street lamp",
            "Street lamp pole number badge faded and peeled"
        ],
        "descs": [
            "One sodium vapor street light is visibly dimmer than neighboring lights. Illumination is weak but visible.",
            "The streetlights remain powered on in broad daylight throughout the afternoon, wasting municipal electricity.",
            "Maintenance inspection cover flap at base of pole is loose, but internal wires are intact and insulated.",
            "A single lamppost at the end of a quiet residential lane flickers occasionally every few minutes.",
            "Overhanging garden branches partially shade the upper glass cover of the lamp post."
        ]
    },
    # MEDIUM (Score ~30-58)
    {
        "tier": "MEDIUM",
        "base_score": (30.0, 58.0),
        "titles": [
            "Non-functioning lamp post near residential colony park",
            "Single street light dead outside apartment complex",
            "Dark spot on residential corner due to blown lamp bulb",
            "Tree branches completely blocking streetlight illumination",
            "Sodium light turned off creating dark stretch on colony lane",
            "Streetlight cycling on and off repeatedly every minute"
        ],
        "descs": [
            "The streetlight has stopped working for the past 5 days, leaving the park pathway dark after sunset.",
            "Lamp bulb is completely dead outside the residential gate, making it uncomfortable for evening walkers.",
            "Dense tree foliage has overgrown around the luminaire head, casting complete shadow over the pedestrian footpath.",
            "Two adjacent lampposts have been non-operational since the recent thunderstorm, causing poor visibility on the lane.",
            "Streetlight keeps blinking on and off continuously, causing annoying glare and poor road visibility."
        ]
    },
    # HIGH (Score ~60-79)
    {
        "tier": "HIGH",
        "base_score": (62.0, 78.0),
        "titles": [
            "Major traffic junction streetlights out causing near-collisions",
            "Entire stretch of 8 streetlights dark along busy arterial road",
            "Complete blackout on highway underpass and slip road",
            "Dark stretch outside girls high school and transit stop attracting anti-socials",
            "Streetlight pole leaning at dangerous 30-degree angle towards street",
            "Unlit sharp blind curve on ring road causing severe accident risk"
        ],
        "descs": [
            "All high-mast floodlights at the busy junction are out. Vehicles entering from four directions cannot see pedestrians crossing in the dark.",
            "A continuous stretch of nearly 500 meters has zero working lights on this high-speed arterial road. High risk of severe vehicle crashes.",
            "Total darkness inside the pedestrian underpass and bus stop area after dusk, creating significant safety hazard and harassment risk for commuters.",
            "Lamppost base damaged by vehicle impact; the steel pole is tilted precariously towards moving traffic and could topple in high winds.",
            "Pitch dark blind curve on the ring road with no road lighting. Motorists are braking sharply at the last second."
        ]
    },
    # CRITICAL (Score ~81-98)
    {
        "tier": "CRITICAL",
        "base_score": (84.0, 97.0),
        "titles": [
            "Exposed live electrical wires sparking at base of street light pole",
            "High voltage wire snapped and dangling at pedestrian eye level",
            "Streetlight pole completely collapsed across active roadway after storm",
            "Sparking distribution box with live current on waterlogged sidewalk",
            "Electrified metal lamppost giving shocks to passersby in rain",
            "Live electrical cable lying across school crossing with children nearby"
        ],
        "descs": [
            "Open junction box at the foot of the metal light pole has exposed live 440V wires sparking intermittently. Located right where school children walk!",
            "Overhead high-tension cable snapped from street light crossarm and is dangling 4 feet above the road. Severe risk of fatal electrocution!",
            "Metal street pole rusted at base has collapsed completely across both lanes, bringing down live overhead power lines onto the street.",
            "Streetlight inspection panel is open and submerged in standing water, visibly sparking and electrocuting puddles on the pedestrian path!",
            "Passersby and stray animals experienced strong electric shocks when brushing against the wet metal pole. Immediate emergency power cut required!"
        ]
    }
]

# Garbage templates
GARBAGE_TEMPLATES = [
    # LOW (Score ~12-28)
    {
        "tier": "LOW",
        "base_score": (12.0, 28.0),
        "titles": [
            "Public pedestrian dustbin full near park entrance",
            "Dry fallen leaves accumulated along street kerb",
            "Discarded empty cardboard packaging boxes stacked beside shop",
            "Sweeper pile left along footpath awaiting scheduled pickup",
            "Recycling bin full of plastic bottles and soda cans",
            "Small garden pruning waste placed neatly on curb"
        ],
        "descs": [
            "Pedestrian waste bin is nearing capacity. Needs regular scheduled emptying by municipal sanitary worker.",
            "Dry tree leaves and paper sweepings collected neatly along the side of the road, waiting for regular collection vehicle.",
            "Empty cardboard cartons and clean packing materials stacked behind the commercial store. Non-hazardous.",
            "Footpath trash container is filled with dry wrappers. No foul smell, just needs routine daily clearing.",
            "Green waste prunings from roadside hedge placed on kerb edge for morning collection."
        ]
    },
    # MEDIUM (Score ~30-58)
    {
        "tier": "MEDIUM",
        "base_score": (32.0, 56.0),
        "titles": [
            "Overflowing municipal dumpster spilling onto pedestrian sidewalk",
            "Stray dogs and cattle scattering garbage from open community bin",
            "Missed garbage collection for 3 consecutive days in residential colony",
            "Uncollected food waste creating foul stench near vegetable market",
            "Litter pile spreading across service lane and choking parking spots",
            "Household waste dumped on vacant roadside corner plot"
        ],
        "descs": [
            "Municipal container is overflowing onto the pavement. Stray dogs are tearing open plastic bags and scattering refuse onto the road.",
            "Sanitation truck has not visited this residential lane for three days. Garbage bags are piling up in front of residential gates.",
            "Vegetable and fruit market waste dumped in open heap, emitting foul smell and attracting flies and mosquitoes.",
            "Litter and domestic trash overflowing from community compactor onto the pedestrian walkway, forcing pedestrians to walk on the busy street.",
            "Unattended garbage mound creating unhygienic conditions and foul odor throughout the colony lane."
        ]
    },
    # HIGH (Score ~60-79)
    {
        "tier": "HIGH",
        "base_score": (62.0, 78.0),
        "titles": [
            "Massive illegal garbage dump choking major stormwater drainage canal",
            "Toxic plastic waste burning openly in residential neighborhood",
            "Enormous rotting garbage heap blocking traffic lane near primary school",
            "Foul decaying waste mound causing severe respiratory irritation to residents",
            "Illegal commercial slaughterhouse waste dumped in open municipal lot",
            "Severe garbage accumulation backing up sewage water onto main street"
        ],
        "descs": [
            "Huge accumulation of plastic waste and trash completely choking the main stormwater nullah. Water is already backing up onto the main road.",
            "Large pile of domestic and industrial plastic waste set on fire illegally. Choking acrid black smoke filling homes and causing severe breathing difficulty!",
            "Heavily rotting waste dump spreading over 20 meters near the primary school gate. Swarms of flies, pungent stench, and serious public health hazard.",
            "Commercial fish and poultry offal dumped on roadside open ground in hot weather. Decomposing animal waste creating unbearable stench and disease risk.",
            "Piles of uncollected waste blocking half of the busy road lane, causing massive traffic snarls and hazardous unsanitary conditions."
        ]
    },
    # CRITICAL (Score ~81-98)
    {
        "tier": "CRITICAL",
        "base_score": (84.0, 97.0),
        "titles": [
            "Hospital biomedical waste with used syringes and blood bags dumped in public alley",
            "Toxic chemical drums illegally dumped leaking hazardous pungent fluid into gutter",
            "Hazardous industrial chemical sludge dumped near community drinking water borewell",
            "Decomposing large animal carcass blocking municipal water supply pump station",
            "Piles of contaminated infectious medical waste abandoned next to children playground",
            "Flammable solvent waste dumped in public alley next to residential kitchen vents"
        ],
        "descs": [
            "Extremely hazardous medical biohazard waste dumped openly: sharp syringes, blood transfusion bags, and discarded pathogen vials within easy reach of playing children!",
            "Four rusted steel drums leaking toxic fluorescent chemical fluid with pungent fumes into the open municipal storm gutter. Residents vomiting and choking!",
            "Toxic chemical sludge dumped illegally directly adjacent to the community drinking water supply pump. Critical risk of groundwater poisoning!",
            "Large decomposing cattle carcass dumped inside the primary drinking water intake canal. Immediate threat of severe waterborne disease epidemic!",
            "Hospital waste including human pathological tissue and surgical sharps abandoned behind public park. Severe biological contamination hazard!"
        ]
    }
]

# Disaster templates
DISASTER_TEMPLATES = {
    "FIRE": [
        # MEDIUM (Score ~38-58)
        {
            "tier": "MEDIUM",
            "base_score": (38.0, 58.0),
            "titles": [
                "Small smoldering trash fire in empty open field",
                "Dry grass caught fire near railway tracks away from buildings",
                "Sparks and smoke from municipal compost mound",
                "Controlled garden leaves burning causing smoke in neighborhood"
            ],
            "descs": [
                "Small patch of dry bushes caught fire in the vacant ground. Smoke visible but no immediate danger to residential structures.",
                "Dry grass smoldering along the railway embankment. Local residents monitoring with buckets of water.",
                "Compost heap emitting persistent smoke and occasional flames in municipal nursery lot."
            ]
        },
        # HIGH (Score ~62-79)
        {
            "tier": "HIGH",
            "base_score": (64.0, 79.0),
            "titles": [
                "Electrical transformer on fire with loud sparks and explosions",
                "Commercial rooftop awning fire spreading towards billboard",
                "Fire breaking out in tire repair workshop on busy street",
                "Flames spreading in roadside timber and bamboo storage yard"
            ],
            "descs": [
                "Heavy electrical transformer has caught fire with loud electrical explosions and dense black smoke. Sparks showering onto parked cars.",
                "Commercial shop signage and awning engulfed in fire. Urgent fire brigade response needed before it catches adjoining apparel showroom.",
                "Fire raging inside auto garage with multiple solvent cans and tires. Fire spreading towards neighboring buildings on main road."
            ]
        },
        # CRITICAL (Score ~82-99)
        {
            "tier": "CRITICAL",
            "base_score": (88.0, 99.0),
            "titles": [
                "Active major fire raging in commercial godown complex - people trapped",
                "LPG cylinder blast and raging fire in densely populated slum cluster",
                "Major chemical factory blaze with toxic fumes spreading across ward",
                "Multi-story apartment building fire with flames blocking fire escape staircase",
                "Hospital intensive care wing caught fire with bedridden patients inside",
                "Petrol pump adjacent godown on fire with imminent explosion risk"
            ],
            "descs": [
                "Massive active commercial fire raging out of control! Huge 30-foot flames, thick toxic black smoke, employees suspected trapped on upper floor. Urgent fire rescue needed!",
                "Multiple LPG cylinders exploded in congested settlement. Raging fire spreading rapidly from hut to hut. Panicked evacuation and severe burn casualties!",
                "Massive chemical warehouse fire emitting deadly noxious sulfur fumes. Entire neighborhood being suffocated. Fire tenders and disaster response teams required immediately!",
                "Flames engulfing the 3rd and 4th floors of apartment complex. Main exit staircase engulfed in flames, trapped families screaming for rescue on balconies!"
            ]
        }
    ],
    "FLOOD": [
        # MEDIUM (Score ~35-58)
        {
            "tier": "MEDIUM",
            "base_score": (35.0, 58.0),
            "titles": [
                "Localized waterlogging on service lane after heavy afternoon shower",
                "Rainwater ponding 4 to 6 inches deep near residential corner",
                "Slow storm drainage causing water accumulation in colony lane",
                "Water pooling near bus stand waiting shed after sudden rain"
            ],
            "descs": [
                "Standing rainwater 4 to 6 inches deep accumulated across 50 meters of service lane. Slow vehicle movement but accessible.",
                "Water accumulated along the pavement curb due to choked street silt trap. Pedestrians must wade through shallow water.",
                "Roadside ponding after thunderstorm, vehicles moving with caution. Water draining slowly over several hours."
            ]
        },
        # HIGH (Score ~62-79)
        {
            "tier": "HIGH",
            "base_score": (64.0, 79.0),
            "titles": [
                "Knee-deep waterlogging inundating major arterial road and underpass",
                "Basement parking lot completely flooded with 20+ vehicles submerged",
                "Stormwater canal overflowing into residential streets and ground floor shops",
                "Severe street inundation halting public bus transit and auto rickshaws"
            ],
            "descs": [
                "Railway underpass flooded with 3 feet of water. Two cars stalled inside and completely abandoned. Road shut down in both directions.",
                "Stormwater drain breached its banks; water has rushed into ground floor shops and residential basements. Heavy property damage occurring.",
                "Severe street inundation reaching knee depth across key arterial avenue. Autos and motorcycles breaking down, traffic paralyzed for kilometers."
            ]
        },
        # CRITICAL (Score ~82-99)
        {
            "tier": "CRITICAL",
            "base_score": (86.0, 98.0),
            "titles": [
                "Major flash flood submerging residential neighborhood - families stranded on roofs",
                "River embankment breached with raging torrent sweeping away vehicles",
                "Severe flash flood drowning main avenue with trapped motorists in floating cars",
                "Hospital ground floor and emergency ward submerged under 4 feet of floodwater",
                "Flash flood washing away road approach to bridge cutting off entire district"
            ],
            "descs": [
                "Raging flash flood water over 5 feet deep rushing through residential colony! Cars being swept away by strong currents, elderly and children trapped on rooftops!",
                "Canal embankment burst violently! Raging torrent entered hundreds of homes, water level rising rapidly past 4 feet within minutes. Immediate NDRF boat rescue needed!",
                "Critical emergency at Civil Hospital: ground floor floodwaters entered ICU and emergency casualty. Power backup submerged, critical patients in grave danger!",
                "Rapidly rising floodwaters have submerged the bridge approach and trapped dozens of passengers inside stranded city buses in the middle of raging current!"
            ]
        }
    ],
    "OTHER": [
        # MEDIUM (Score ~32-58)
        {
            "tier": "MEDIUM",
            "base_score": (32.0, 58.0),
            "titles": [
                "Minor corrugated roof sheet dislodged by strong wind gust",
                "Large tree branch fallen across sidewalk parking shoulder",
                "Commercial tin billboard banner torn and flapping over footpath",
                "Cracked plaster peeling from old boundary wall on lane"
            ],
            "descs": [
                "Heavy gust of wind dislodged a tin shed sheet. Hanging loosely from shed roof, no injuries reported.",
                "Medium-sized tree branch snapped and fell across the sidewalk. Pedestrians have to step onto road shoulder.",
                "Cloth and metal advertising banner ripped loose and hanging awkwardly over the street."
            ]
        },
        # HIGH (Score ~62-79)
        {
            "tier": "HIGH",
            "base_score": (64.0, 79.0),
            "titles": [
                "Massive ancient banyan tree uprooted crushing two cars and blocking 3 lanes",
                "Heavy concrete billboard frame bent and dangling precariously over highway",
                "Substantial soil landslide debris blocking hillside access road",
                "Old brick compound wall collapsed onto busy pedestrian footpath"
            ],
            "descs": [
                "Giant old tree completely uprooted in heavy storm, crushed two parked vehicles and totally blocked both lanes of the major connecting road.",
                "Heavy structural steel hoarding damaged by gale force winds, dangling at an acute angle over busy vehicular traffic. Collapse imminent.",
                "Landslide brought down tons of mud and boulders across the arterial highway, cutting off vehicular movement and damaging roadside barriers."
            ]
        },
        # CRITICAL (Score ~82-99)
        {
            "tier": "CRITICAL",
            "base_score": (87.0, 98.0),
            "titles": [
                "Multi-story dilapidated building facade collapsed onto crowded street - victims trapped",
                "Flyover expansion joint separated and concrete slab cracking under traffic",
                "Pedestrian footbridge steel girder fractured and sagging over busy railway line",
                "Severe structural wall collapse crushing market stalls with people buried under rubble",
                "Construction crane collapsed across residential apartment building"
            ],
            "descs": [
                "Three-story old building balcony and masonry wall collapsed suddenly onto crowded market street! Multiple pedestrians buried under heavy concrete rubble, desperate cries for help!",
                "Major flyover bridge girder developed massive visible fractures and concrete chunks falling on vehicles below. Imminent danger of catastrophic bridge collapse!",
                "Heavy construction tower crane snapped at boom and crashed onto residential roof, rupturing gas lines and causing structural compromise. Urgent disaster rescue needed!"
            ]
        }
    ]
}

def generate_sample(complaint_id: str):
    category_choice = random.choices(
        ["POTHOLES", "STREET_LIGHTS", "GARBAGE", "DISASTERS"],
        weights=[0.30, 0.28, 0.26, 0.16]
    )[0]

    landmark = random.choice(LANDMARKS)
    voice = random.choice(CITIZEN_VOICES)
    disaster_type = ""

    if category_choice == "POTHOLES":
        tier_data = random.choices(
            POTHOLE_TEMPLATES,
            weights=[0.20, 0.35, 0.30, 0.15]
        )[0]
    elif category_choice == "STREET_LIGHTS":
        tier_data = random.choices(
            STREETLIGHT_TEMPLATES,
            weights=[0.20, 0.35, 0.30, 0.15]
        )[0]
    elif category_choice == "GARBAGE":
        tier_data = random.choices(
            GARBAGE_TEMPLATES,
            weights=[0.20, 0.35, 0.30, 0.15]
        )[0]
    else:  # DISASTERS
        disaster_type = random.choices(["FIRE", "FLOOD", "OTHER"], weights=[0.40, 0.40, 0.20])[0]
        sub_templates = DISASTER_TEMPLATES[disaster_type]
        tier_data = random.choices(
            sub_templates,
            weights=[0.15, 0.35, 0.50]  # Disasters skew higher severity
        )[0]

    title = random.choice(tier_data["titles"])
    desc_core = random.choice(tier_data["descs"])

    # Build natural description with location and citizen remarks
    style = random.randint(1, 4)
    if style == 1:
        description = f"{desc_core} Located {landmark}. {voice}"
    elif style == 2:
        description = f"{landmark}: {desc_core} {voice}"
    elif style == 3:
        description = f"{desc_core} {voice} (Location: {landmark})"
    else:
        description = f"{desc_core} Immediate attention required {landmark}. {voice}"

    # Generate continuous, realistic severity score within tier with small gaussian jitter
    min_score, max_score = tier_data["base_score"]
    raw_score = random.uniform(min_score, max_score) + random.gauss(0, 1.2)
    severity_score = round(max(5.0, min(99.5, raw_score)), 1)

    # Classify priority level
    if severity_score >= 80.0:
        priority_level = "CRITICAL"
        is_safety = 1
    elif severity_score >= 60.0:
        priority_level = "HIGH"
        is_safety = 1 if (tier_data["tier"] in ["HIGH", "CRITICAL"] or category_choice == "DISASTERS") else 0
    elif severity_score >= 35.0:
        priority_level = "MEDIUM"
        is_safety = 0
    else:
        priority_level = "LOW"
        is_safety = 0

    # Approximate GPS coordinates centered around urban cluster (e.g. 25.77-25.79 N, 84.29-84.32 E)
    lat = round(25.7700 + random.uniform(-0.025, 0.025), 6)
    lon = round(84.3050 + random.uniform(-0.025, 0.025), 6)

    return {
        "complaint_id": complaint_id,
        "primary_category": category_choice,
        "disaster_type": disaster_type,
        "title": f"{title} - {landmark.split(',')[0]}",
        "description": description,
        "latitude": lat,
        "longitude": lon,
        "street_landmark": landmark,
        "severity_score": severity_score,
        "priority_level": priority_level,
        "is_safety_hazard": is_safety
    }

def main():
    print(f"Generating 5,000 production-grade realistic civic records...")
    rows = []
    for i in range(1, 5001):
        cid = f"CMP-{i:05d}"
        rows.append(generate_sample(cid))

    fieldnames = [
        "complaint_id",
        "primary_category",
        "disaster_type",
        "title",
        "description",
        "latitude",
        "longitude",
        "street_landmark",
        "severity_score",
        "priority_level",
        "is_safety_hazard"
    ]

    # Write CSV
    with open(OUTPUT_CSV, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f"[SUCCESS] CSV written to: {OUTPUT_CSV} ({OUTPUT_CSV.stat().st_size / 1024:.1f} KB)")

    # Write JSON
    with open(OUTPUT_JSON, mode="w", encoding="utf-8") as f:
        json.dump(rows, f, indent=2)
    print(f"[SUCCESS] JSON written to: {OUTPUT_JSON} ({OUTPUT_JSON.stat().st_size / 1024:.1f} KB)")

    # Print summary statistics
    cats = {}
    priorities = {}
    for r in rows:
        cats[r["primary_category"]] = cats.get(r["primary_category"], 0) + 1
        priorities[r["priority_level"]] = priorities.get(r["priority_level"], 0) + 1

    print("\n--- Distribution Summary ---")
    print("Categories:", cats)
    print("Priority Levels:", priorities)

if __name__ == "__main__":
    main()

