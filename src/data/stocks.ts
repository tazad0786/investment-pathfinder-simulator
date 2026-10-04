import { CapCategory, RiskLevel, Stock } from '../types';
import { between, gaussian, round, roundTick, seededRng } from '../lib/random';

// [ticker, name, sector, price (₹), market cap (₹ Cr)] — illustrative values for simulation only.
type StockSeed = [string, string, string, number, number];

const EQUITY_SEEDS: StockSeed[] = [
  // Large caps
  ['RELIANCE', 'Reliance Industries Ltd', 'Energy', 1420, 1921000],
  ['HDFCBANK', 'HDFC Bank Ltd', 'Banking', 985, 1508000],
  ['TCS', 'Tata Consultancy Services Ltd', 'Information Technology', 3050, 1103000],
  ['BHARTIARTL', 'Bharti Airtel Ltd', 'Telecom', 1960, 1172000],
  ['ICICIBANK', 'ICICI Bank Ltd', 'Banking', 1385, 988000],
  ['SBIN', 'State Bank of India', 'Banking', 865, 772000],
  ['INFY', 'Infosys Ltd', 'Information Technology', 1510, 627000],
  ['BAJFINANCE', 'Bajaj Finance Ltd', 'Financial Services', 1005, 624000],
  ['HINDUNILVR', 'Hindustan Unilever Ltd', 'FMCG', 2480, 582000],
  ['LICI', 'Life Insurance Corporation of India', 'Insurance', 905, 572000],
  ['ITC', 'ITC Ltd', 'FMCG', 412, 516000],
  ['LT', 'Larsen & Toubro Ltd', 'Capital Goods', 3720, 511000],
  ['MARUTI', 'Maruti Suzuki India Ltd', 'Automobile', 15600, 490000],
  ['HCLTECH', 'HCL Technologies Ltd', 'Information Technology', 1520, 412000],
  ['SUNPHARMA', 'Sun Pharmaceutical Industries Ltd', 'Pharma & Healthcare', 1660, 398000],
  ['M&M', 'Mahindra & Mahindra Ltd', 'Automobile', 3480, 432000],
  ['KOTAKBANK', 'Kotak Mahindra Bank Ltd', 'Banking', 2110, 419000],
  ['AXISBANK', 'Axis Bank Ltd', 'Banking', 1160, 360000],
  ['ULTRACEMCO', 'UltraTech Cement Ltd', 'Cement', 12100, 356000],
  ['NTPC', 'NTPC Ltd', 'Power', 342, 331000],
  ['TITAN', 'Titan Company Ltd', 'Consumer Durables', 3620, 321000],
  ['ONGC', 'Oil & Natural Gas Corporation Ltd', 'Energy', 246, 309000],
  ['HAL', 'Hindustan Aeronautics Ltd', 'Defence', 4720, 315000],
  ['BEL', 'Bharat Electronics Ltd', 'Defence', 412, 301000],
  ['ADANIPORTS', 'Adani Ports & SEZ Ltd', 'Infrastructure', 1420, 306000],
  ['ETERNAL', 'Eternal Ltd (Zomato)', 'Consumer Tech', 322, 311000],
  ['POWERGRID', 'Power Grid Corporation of India Ltd', 'Power', 292, 271000],
  ['BAJAJFINSV', 'Bajaj Finserv Ltd', 'Financial Services', 2010, 321000],
  ['WIPRO', 'Wipro Ltd', 'Information Technology', 252, 264000],
  ['DMART', 'Avenue Supermarts Ltd', 'Retail', 4320, 281000],
  ['ADANIENT', 'Adani Enterprises Ltd', 'Diversified', 2420, 279000],
  ['JSWSTEEL', 'JSW Steel Ltd', 'Metals & Mining', 1110, 271000],
  ['COALINDIA', 'Coal India Ltd', 'Metals & Mining', 392, 241000],
  ['NESTLEIND', 'Nestle India Ltd', 'FMCG', 1210, 233000],
  ['TATASTEEL', 'Tata Steel Ltd', 'Metals & Mining', 166, 207000],
  ['JIOFIN', 'Jio Financial Services Ltd', 'Financial Services', 305, 194000],
  ['TRENT', 'Trent Ltd', 'Retail', 4750, 169000],
  ['ASIANPAINT', 'Asian Paints Ltd', 'Consumer Durables', 2420, 232000],
  ['SBILIFE', 'SBI Life Insurance Company Ltd', 'Insurance', 1850, 185000],
  ['GRASIM', 'Grasim Industries Ltd', 'Cement', 2760, 188000],
  ['HINDALCO', 'Hindalco Industries Ltd', 'Metals & Mining', 752, 169000],
  ['TECHM', 'Tech Mahindra Ltd', 'Information Technology', 1460, 143000],
  ['VEDL', 'Vedanta Ltd', 'Metals & Mining', 472, 184000],
  ['BAJAJ-AUTO', 'Bajaj Auto Ltd', 'Automobile', 8820, 246000],
  ['EICHERMOT', 'Eicher Motors Ltd', 'Automobile', 6850, 188000],
  ['HDFCLIFE', 'HDFC Life Insurance Company Ltd', 'Insurance', 755, 162000],
  ['DIVISLAB', 'Divi\'s Laboratories Ltd', 'Pharma & Healthcare', 6050, 161000],
  ['CIPLA', 'Cipla Ltd', 'Pharma & Healthcare', 1560, 126000],
  ['SHRIRAMFIN', 'Shriram Finance Ltd', 'Financial Services', 655, 123000],
  ['APOLLOHOSP', 'Apollo Hospitals Enterprise Ltd', 'Pharma & Healthcare', 7620, 109000],
  ['DRREDDY', 'Dr. Reddy\'s Laboratories Ltd', 'Pharma & Healthcare', 1255, 105000],
  ['TATACONSUM', 'Tata Consumer Products Ltd', 'FMCG', 1150, 113000],
  ['BRITANNIA', 'Britannia Industries Ltd', 'FMCG', 5920, 142000],
  ['HEROMOTOCO', 'Hero MotoCorp Ltd', 'Automobile', 5320, 106000],
  ['INDUSINDBK', 'IndusInd Bank Ltd', 'Banking', 752, 58600],
  ['TMPV', 'Tata Motors Passenger Vehicles Ltd', 'Automobile', 412, 151000],
  ['ADANIPOWER', 'Adani Power Ltd', 'Power', 148, 285000],
  ['ADANIGREEN', 'Adani Green Energy Ltd', 'Power', 1010, 160000],
  ['IOC', 'Indian Oil Corporation Ltd', 'Energy', 148, 209000],
  ['BPCL', 'Bharat Petroleum Corporation Ltd', 'Energy', 335, 145000],
  ['PFC', 'Power Finance Corporation Ltd', 'Financial Services', 402, 132000],
  ['RECLTD', 'REC Ltd', 'Financial Services', 382, 100500],
  ['IRFC', 'Indian Railway Finance Corporation Ltd', 'Financial Services', 126, 164000],
  ['SIEMENS', 'Siemens Ltd', 'Capital Goods', 3120, 111000],
  ['ABB', 'ABB India Ltd', 'Capital Goods', 5220, 110600],
  ['DLF', 'DLF Ltd', 'Realty', 752, 186000],
  ['PIDILITIND', 'Pidilite Industries Ltd', 'Chemicals', 1460, 148000],
  ['GODREJCP', 'Godrej Consumer Products Ltd', 'FMCG', 1160, 118000],
  ['BANKBARODA', 'Bank of Baroda', 'Banking', 252, 130000],
  ['PNB', 'Punjab National Bank', 'Banking', 112, 128000],
  ['CANBK', 'Canara Bank', 'Banking', 118, 107000],
  ['UNIONBANK', 'Union Bank of India', 'Banking', 142, 108000],
  ['TVSMOTOR', 'TVS Motor Company Ltd', 'Automobile', 3420, 162000],
  ['AMBUJACEM', 'Ambuja Cements Ltd', 'Cement', 572, 141000],
  ['DABUR', 'Dabur India Ltd', 'FMCG', 505, 89500],
  ['UNITDSPR', 'United Spirits Ltd', 'FMCG', 1360, 98900],
  ['ICICIGI', 'ICICI Lombard General Insurance Ltd', 'Insurance', 1960, 97200],
  ['ICICIPRULI', 'ICICI Prudential Life Insurance Ltd', 'Insurance', 605, 87500],
  ['NAUKRI', 'Info Edge (India) Ltd', 'Consumer Tech', 1360, 88000],
  ['LTIM', 'LTIMindtree Ltd', 'Information Technology', 5250, 155000],
  ['CHOLAFIN', 'Cholamandalam Investment & Finance Ltd', 'Financial Services', 1560, 131000],
  ['MAZDOCK', 'Mazagon Dock Shipbuilders Ltd', 'Defence', 2820, 113700],
  ['GAIL', 'GAIL (India) Ltd', 'Energy', 182, 119600],
  ['HINDZINC', 'Hindustan Zinc Ltd', 'Metals & Mining', 482, 203600],
  ['TORNTPHARM', 'Torrent Pharmaceuticals Ltd', 'Pharma & Healthcare', 3520, 119100],
  ['MOTHERSON', 'Samvardhana Motherson International Ltd', 'Auto Components', 102, 107600],
  ['BOSCHLTD', 'Bosch Ltd', 'Auto Components', 38200, 112600],
  ['INDIGO', 'InterGlobe Aviation Ltd', 'Aviation', 5650, 218300],
  // Mid caps
  ['PERSISTENT', 'Persistent Systems Ltd', 'Information Technology', 5820, 90800],
  ['DIXON', 'Dixon Technologies (India) Ltd', 'Consumer Durables', 16200, 97400],
  ['POLYCAB', 'Polycab India Ltd', 'Capital Goods', 7250, 109000],
  ['COFORGE', 'Coforge Ltd', 'Information Technology', 1720, 57500],
  ['MPHASIS', 'Mphasis Ltd', 'Information Technology', 2820, 53600],
  ['LUPIN', 'Lupin Ltd', 'Pharma & Healthcare', 2010, 91700],
  ['AUROPHARMA', 'Aurobindo Pharma Ltd', 'Pharma & Healthcare', 1110, 64500],
  ['ALKEM', 'Alkem Laboratories Ltd', 'Pharma & Healthcare', 5420, 64800],
  ['ZYDUSLIFE', 'Zydus Lifesciences Ltd', 'Pharma & Healthcare', 1005, 101100],
  ['MAXHEALTH', 'Max Healthcare Institute Ltd', 'Pharma & Healthcare', 1155, 112300],
  ['FORTIS', 'Fortis Healthcare Ltd', 'Pharma & Healthcare', 905, 68300],
  ['INDHOTEL', 'The Indian Hotels Company Ltd', 'Hospitality', 752, 107000],
  ['TATAPOWER', 'Tata Power Company Ltd', 'Power', 392, 125300],
  ['VOLTAS', 'Voltas Ltd', 'Consumer Durables', 1360, 45000],
  ['HAVELLS', 'Havells India Ltd', 'Consumer Durables', 1510, 94600],
  ['CUMMINSIND', 'Cummins India Ltd', 'Capital Goods', 3820, 105900],
  ['BHARATFORG', 'Bharat Forge Ltd', 'Auto Components', 1255, 60000],
  ['ASHOKLEY', 'Ashok Leyland Ltd', 'Automobile', 142, 83400],
  ['BALKRISIND', 'Balkrishna Industries Ltd', 'Auto Components', 2410, 46600],
  ['MRF', 'MRF Ltd', 'Auto Components', 145200, 61600],
  ['PAGEIND', 'Page Industries Ltd', 'Textiles', 44100, 49200],
  ['PIIND', 'PI Industries Ltd', 'Chemicals', 3620, 54900],
  ['SRF', 'SRF Ltd', 'Chemicals', 2920, 86600],
  ['DEEPAKNTR', 'Deepak Nitrite Ltd', 'Chemicals', 1905, 26000],
  ['UPL', 'UPL Ltd', 'Chemicals', 685, 54300],
  ['IDFCFIRSTB', 'IDFC First Bank Ltd', 'Banking', 72.5, 53200],
  ['FEDERALBNK', 'The Federal Bank Ltd', 'Banking', 202, 49700],
  ['AUBANK', 'AU Small Finance Bank Ltd', 'Banking', 752, 56000],
  ['BANDHANBNK', 'Bandhan Bank Ltd', 'Banking', 166, 26700],
  ['IRCTC', 'Indian Railway Catering & Tourism Corp Ltd', 'Hospitality', 722, 57800],
  ['RVNL', 'Rail Vikas Nigam Ltd', 'Infrastructure', 332, 69200],
  ['NHPC', 'NHPC Ltd', 'Power', 81.5, 81900],
  ['BHEL', 'Bharat Heavy Electricals Ltd', 'Capital Goods', 242, 84300],
  ['HINDPETRO', 'Hindustan Petroleum Corporation Ltd', 'Energy', 432, 91900],
  ['GODREJPROP', 'Godrej Properties Ltd', 'Realty', 2210, 66500],
  ['OBEROIRLTY', 'Oberoi Realty Ltd', 'Realty', 1655, 60200],
  ['LODHA', 'Lodha Developers Ltd', 'Realty', 1155, 115300],
  ['PRESTIGE', 'Prestige Estates Projects Ltd', 'Realty', 1610, 69300],
  ['PHOENIXLTD', 'The Phoenix Mills Ltd', 'Realty', 1605, 57400],
  ['MUTHOOTFIN', 'Muthoot Finance Ltd', 'Financial Services', 3020, 121200],
  ['MFSL', 'Max Financial Services Ltd', 'Insurance', 1555, 53700],
  ['POLICYBZR', 'PB Fintech Ltd', 'Consumer Tech', 1810, 83200],
  ['PAYTM', 'One 97 Communications Ltd', 'Consumer Tech', 1205, 76900],
  ['NYKAA', 'FSN E-Commerce Ventures Ltd', 'Consumer Tech', 232, 66300],
  ['SWIGGY', 'Swiggy Ltd', 'Consumer Tech', 422, 105000],
  ['DELHIVERY', 'Delhivery Ltd', 'Logistics', 452, 33700],
  ['IDEA', 'Vodafone Idea Ltd', 'Telecom', 8.6, 93200],
  ['INDUSTOWER', 'Indus Towers Ltd', 'Telecom', 362, 97500],
  ['TATAELXSI', 'Tata Elxsi Ltd', 'Information Technology', 5520, 34400],
  ['KPITTECH', 'KPIT Technologies Ltd', 'Information Technology', 1255, 34400],
  ['OFSS', 'Oracle Financial Services Software Ltd', 'Information Technology', 8520, 74000],
  ['MARICO', 'Marico Ltd', 'FMCG', 705, 91200],
  ['COLPAL', 'Colgate-Palmolive (India) Ltd', 'FMCG', 2210, 60100],
  ['VBL', 'Varun Beverages Ltd', 'FMCG', 472, 159600],
  ['JUBLFOOD', 'Jubilant FoodWorks Ltd', 'Consumer Services', 622, 41000],
  ['CGPOWER', 'CG Power & Industrial Solutions Ltd', 'Capital Goods', 752, 115000],
  ['SUZLON', 'Suzlon Energy Ltd', 'Power', 58.4, 79700],
  ['WAAREEENER', 'Waaree Energies Ltd', 'Power', 3320, 95400],
  ['COCHINSHIP', 'Cochin Shipyard Ltd', 'Defence', 1720, 45300],
  ['BDL', 'Bharat Dynamics Ltd', 'Defence', 1520, 55700],
  ['SOLARINDS', 'Solar Industries India Ltd', 'Defence', 13600, 123000],
  ['ASTRAL', 'Astral Ltd', 'Capital Goods', 1410, 37900],
  ['SUPREMEIND', 'Supreme Industries Ltd', 'Capital Goods', 4320, 54900],
  ['KEI', 'KEI Industries Ltd', 'Capital Goods', 4020, 38400],
  ['APLAPOLLO', 'APL Apollo Tubes Ltd', 'Metals & Mining', 1720, 47700],
  ['JINDALSTEL', 'Jindal Steel & Power Ltd', 'Metals & Mining', 1005, 102500],
  ['SAIL', 'Steel Authority of India Ltd', 'Metals & Mining', 135, 55800],
  ['NMDC', 'NMDC Ltd', 'Metals & Mining', 75.5, 66400],
  ['NATIONALUM', 'National Aluminium Company Ltd', 'Metals & Mining', 222, 40800],
  ['SHREECEM', 'Shree Cement Ltd', 'Cement', 29100, 105000],
  ['ACC', 'ACC Ltd', 'Cement', 1855, 34800],
  ['DALBHARAT', 'Dalmia Bharat Ltd', 'Cement', 2210, 41400],
  ['JKCEMENT', 'JK Cement Ltd', 'Cement', 6520, 50400],
  ['BIOCON', 'Biocon Ltd', 'Pharma & Healthcare', 362, 43400],
  ['GLENMARK', 'Glenmark Pharmaceuticals Ltd', 'Pharma & Healthcare', 1905, 53700],
  ['LAURUSLABS', 'Laurus Labs Ltd', 'Pharma & Healthcare', 905, 48800],
  ['LICHSGFIN', 'LIC Housing Finance Ltd', 'Financial Services', 582, 32000],
  ['SONACOMS', 'Sona BLW Precision Forgings Ltd', 'Auto Components', 452, 28100],
  ['EXIDEIND', 'Exide Industries Ltd', 'Auto Components', 392, 33300],
  ['COROMANDEL', 'Coromandel International Ltd', 'Chemicals', 2310, 68000],
  ['MCX', 'Multi Commodity Exchange of India Ltd', 'Capital Markets', 8120, 41400],
  ['BSE', 'BSE Ltd', 'Capital Markets', 2420, 98300],
  ['HDFCAMC', 'HDFC Asset Management Company Ltd', 'Capital Markets', 5420, 115800],
  ['NAM-INDIA', 'Nippon Life India Asset Management Ltd', 'Capital Markets', 852, 54100],
  // Small caps
  ['CDSL', 'Central Depository Services (India) Ltd', 'Capital Markets', 1555, 32500],
  ['ANGELONE', 'Angel One Ltd', 'Capital Markets', 2410, 21800],
  ['KFINTECH', 'KFin Technologies Ltd', 'Capital Markets', 1105, 19000],
  ['CAMS', 'Computer Age Management Services Ltd', 'Capital Markets', 3820, 18900],
  ['IEX', 'Indian Energy Exchange Ltd', 'Capital Markets', 142, 12700],
  ['HFCL', 'HFCL Ltd', 'Telecom', 75.5, 10900],
  ['RAILTEL', 'RailTel Corporation of India Ltd', 'Telecom', 382, 12300],
  ['IRCON', 'IRCON International Ltd', 'Infrastructure', 176, 16600],
  ['HUDCO', 'Housing & Urban Development Corp Ltd', 'Financial Services', 226, 45200],
  ['IREDA', 'Indian Renewable Energy Development Agency Ltd', 'Financial Services', 152, 42700],
  ['NBCC', 'NBCC (India) Ltd', 'Infrastructure', 112, 30200],
  ['ZENTEC', 'Zen Technologies Ltd', 'Defence', 1505, 13600],
  ['KAYNES', 'Kaynes Technology India Ltd', 'Capital Goods', 6020, 40300],
  ['AMBER', 'Amber Enterprises India Ltd', 'Consumer Durables', 7020, 23700],
  ['CAMPUS', 'Campus Activewear Ltd', 'Retail', 282, 8600],
  ['RBLBANK', 'RBL Bank Ltd', 'Banking', 272, 16500],
  ['KARURVYSYA', 'Karur Vysya Bank Ltd', 'Banking', 222, 17900],
  ['CESC', 'CESC Ltd', 'Power', 162, 21500],
  ['YESBANK', 'Yes Bank Ltd', 'Banking', 21.4, 67100],
  ['ZEEL', 'Zee Entertainment Enterprises Ltd', 'Media & Entertainment', 118, 11300],
  ['PVRINOX', 'PVR INOX Ltd', 'Media & Entertainment', 1105, 10800],
  ['NAZARA', 'Nazara Technologies Ltd', 'Media & Entertainment', 1305, 11400],
  ['MANAPPURAM', 'Manappuram Finance Ltd', 'Financial Services', 272, 23000],
  ['PNBHOUSING', 'PNB Housing Finance Ltd', 'Financial Services', 905, 23500],
  ['CANFINHOME', 'Can Fin Homes Ltd', 'Financial Services', 802, 10700],
  ['AAVAS', 'Aavas Financiers Ltd', 'Financial Services', 1720, 13600],
  ['GRSE', 'Garden Reach Shipbuilders & Engineers Ltd', 'Defence', 2520, 28900],
  ['CHAMBLFERT', 'Chambal Fertilisers & Chemicals Ltd', 'Chemicals', 522, 20900],
  ['RCF', 'Rashtriya Chemicals & Fertilizers Ltd', 'Chemicals', 152, 8400],
  ['TANLA', 'Tanla Platforms Ltd', 'Information Technology', 652, 8800],
  ['ROUTE', 'Route Mobile Ltd', 'Information Technology', 1105, 6900],
  ['HAPPSTMNDS', 'Happiest Minds Technologies Ltd', 'Information Technology', 602, 9200],
  ['SONATSOFTW', 'Sonata Software Ltd', 'Information Technology', 382, 10700],
  ['BIRLASOFT', 'Birlasoft Ltd', 'Information Technology', 402, 11100],
  ['CYIENT', 'Cyient Ltd', 'Information Technology', 1205, 13400],
  ['NEWGEN', 'Newgen Software Technologies Ltd', 'Information Technology', 905, 12800],
  ['INTELLECT', 'Intellect Design Arena Ltd', 'Information Technology', 1005, 14000],
  ['LATENTVIEW', 'LatentView Analytics Ltd', 'Information Technology', 452, 9300],
  ['INOXWIND', 'Inox Wind Ltd', 'Power', 146, 25200],
  ['PREMIERENE', 'Premier Energies Ltd', 'Power', 1005, 45300],
  ['DATAPATTNS', 'Data Patterns (India) Ltd', 'Defence', 2720, 15200],
  ['IPCALAB', 'Ipca Laboratories Ltd', 'Pharma & Healthcare', 1405, 35600],
  ['GRANULES', 'Granules India Ltd', 'Pharma & Healthcare', 482, 11700],
  ['NATCOPHARM', 'Natco Pharma Ltd', 'Pharma & Healthcare', 852, 15300],
  ['TRIDENT', 'Trident Ltd', 'Textiles', 28.6, 14600],
  ['RENUKA', 'Shree Renuka Sugars Ltd', 'FMCG', 30.5, 6500],
  ['GSFC', 'Gujarat State Fertilizers & Chemicals Ltd', 'Chemicals', 212, 8400],
  ['JWL', 'Jupiter Wagons Ltd', 'Capital Goods', 322, 13700],
  ['TITAGARH', 'Titagarh Rail Systems Ltd', 'Capital Goods', 852, 11500],
  ['SJVN', 'SJVN Ltd', 'Power', 95.5, 37500],
  ['EASEMYTRIP', 'Easy Trip Planners Ltd', 'Consumer Tech', 9.8, 3500],
  ['IDBI', 'IDBI Bank Ltd', 'Banking', 92.5, 99500],
  ['UJJIVANSFB', 'Ujjivan Small Finance Bank Ltd', 'Banking', 46.5, 9000],
  ['KALYANKJIL', 'Kalyan Jewellers India Ltd', 'Consumer Durables', 502, 51800],
  ['BATAINDIA', 'Bata India Ltd', 'Retail', 1205, 15500],
  ['RELAXO', 'Relaxo Footwears Ltd', 'Retail', 452, 11200],
  ['VGUARD', 'V-Guard Industries Ltd', 'Consumer Durables', 382, 16600],
  ['CROMPTON', 'Crompton Greaves Consumer Electricals Ltd', 'Consumer Durables', 322, 20700],
  ['BLUESTARCO', 'Blue Star Ltd', 'Consumer Durables', 1855, 38100],
  ['CENTURYPLY', 'Century Plyboards (India) Ltd', 'Consumer Durables', 752, 16700],
];

// [ticker, name, category, price, AUM (₹ Cr)]
const ETF_SEEDS: StockSeed[] = [
  ['NIFTYBEES', 'Nippon India ETF Nifty 50 BeES', 'ETF - Index', 285, 42500],
  ['BANKBEES', 'Nippon India ETF Nifty Bank BeES', 'ETF - Index', 575, 6800],
  ['JUNIORBEES', 'Nippon India ETF Nifty Next 50 Junior BeES', 'ETF - Index', 742, 6200],
  ['SETFNIF50', 'SBI Nifty 50 ETF', 'ETF - Index', 268, 198000],
  ['MID150BEES', 'Nippon India ETF Nifty Midcap 150', 'ETF - Index', 228, 2600],
  ['ITBEES', 'Nippon India ETF Nifty IT', 'ETF - Sectoral', 41.5, 2400],
  ['PSUBNKBEES', 'Nippon India ETF Nifty PSU Bank BeES', 'ETF - Sectoral', 82.5, 2900],
  ['CPSEETF', 'CPSE ETF', 'ETF - Thematic', 92.5, 32000],
  ['GOLDBEES', 'Nippon India ETF Gold BeES', 'ETF - Gold', 98.5, 21000],
  ['SILVERBEES', 'Nippon India Silver ETF', 'ETF - Silver', 142, 9000],
  ['MON100', 'Motilal Oswal Nasdaq 100 ETF', 'ETF - International', 205, 9000],
  ['MAFANG', 'Mirae Asset NYSE FANG+ ETF', 'ETF - International', 128, 3200],
  ['HNGSNGBEES', 'Nippon India ETF Hang Seng BeES', 'ETF - International', 482, 600],
  ['LIQUIDBEES', 'Nippon India ETF Nifty 1D Rate Liquid BeES', 'ETF - Liquid', 1000, 11000],
  ['EBBETF0433', 'Bharat Bond ETF April 2033', 'ETF - Debt', 1385, 5600],
  ['ICICIB22', 'Bharat 22 ETF', 'ETF - Thematic', 112, 17500],
];

interface SectorProfile {
  pe: [number, number];
  de: [number, number];
  div: [number, number];
  growth: [number, number];
  roe: [number, number];
  vol: number;
  blurb: string;
}

const SECTOR_PROFILES: Record<string, SectorProfile> = {
  Banking: { pe: [8, 20], de: [6, 9], div: [0.4, 2], growth: [10, 30], roe: [10, 18], vol: 24, blurb: 'operates a lending and deposit franchise across retail, SME and corporate customers' },
  'Financial Services': { pe: [12, 35], de: [2, 7], div: [0.2, 2.5], growth: [15, 35], roe: [12, 22], vol: 30, blurb: 'provides credit, investment and financial products to individuals and businesses' },
  Insurance: { pe: [40, 90], de: [0, 0.2], div: [0.1, 1], growth: [8, 22], roe: [10, 18], vol: 24, blurb: 'underwrites insurance policies and manages long-term policyholder assets' },
  'Information Technology': { pe: [20, 45], de: [0, 0.15], div: [1, 4], growth: [6, 22], roe: [20, 40], vol: 26, blurb: 'delivers software services, digital transformation and consulting to global clients' },
  Energy: { pe: [6, 20], de: [0.3, 1.2], div: [2, 6], growth: [4, 18], roe: [10, 18], vol: 26, blurb: 'operates across oil, gas, refining and fuel marketing value chains' },
  FMCG: { pe: [35, 70], de: [0, 0.3], div: [1, 3.5], growth: [6, 15], roe: [20, 80], vol: 18, blurb: 'manufactures and distributes everyday consumer brands across India' },
  'Capital Goods': { pe: [30, 80], de: [0, 0.6], div: [0.2, 1.2], growth: [15, 40], roe: [14, 30], vol: 32, blurb: 'manufactures industrial equipment and benefits from the capex and infrastructure cycle' },
  Automobile: { pe: [18, 35], de: [0, 1.2], div: [0.5, 3], growth: [10, 35], roe: [14, 30], vol: 28, blurb: 'designs and sells vehicles across passenger, commercial and two-wheeler segments' },
  'Auto Components': { pe: [25, 55], de: [0.1, 0.8], div: [0.3, 1.5], growth: [10, 30], roe: [12, 24], vol: 30, blurb: 'supplies critical components to domestic and global automakers' },
  'Pharma & Healthcare': { pe: [25, 60], de: [0, 0.5], div: [0.2, 1.2], growth: [10, 28], roe: [12, 24], vol: 24, blurb: 'develops and markets generic, specialty and branded pharmaceuticals or healthcare services' },
  Cement: { pe: [25, 55], de: [0.1, 0.6], div: [0.2, 1], growth: [6, 20], roe: [8, 15], vol: 24, blurb: 'produces cement and building materials for housing and infrastructure' },
  Power: { pe: [15, 60], de: [0.8, 2.5], div: [0, 4], growth: [10, 40], roe: [10, 20], vol: 34, blurb: 'generates, transmits or distributes electricity including renewable capacity' },
  'Consumer Durables': { pe: [45, 100], de: [0, 0.4], div: [0.1, 1], growth: [12, 35], roe: [15, 30], vol: 28, blurb: 'sells branded durable goods to India\'s growing consuming class' },
  Defence: { pe: [40, 80], de: [0, 0.1], div: [0.3, 1.5], growth: [18, 45], roe: [18, 30], vol: 38, blurb: 'builds aerospace, naval and defence systems for the armed forces' },
  Infrastructure: { pe: [20, 55], de: [0.4, 1.6], div: [0.3, 2], growth: [12, 35], roe: [10, 20], vol: 34, blurb: 'executes and operates infrastructure assets such as ports, rail and EPC projects' },
  'Consumer Tech': { pe: [80, 250], de: [0, 0.1], div: [0, 0], growth: [25, 90], roe: [1, 10], vol: 42, blurb: 'runs a fast-growing internet platform serving millions of users' },
  Telecom: { pe: [30, 90], de: [0.8, 3], div: [0, 2], growth: [8, 40], roe: [5, 20], vol: 30, blurb: 'provides mobile, broadband and digital connectivity services' },
  Retail: { pe: [60, 140], de: [0, 0.5], div: [0, 0.5], growth: [18, 40], roe: [12, 25], vol: 30, blurb: 'operates a large network of retail stores and omnichannel commerce' },
  Diversified: { pe: [40, 90], de: [0.8, 1.6], div: [0, 0.5], growth: [15, 40], roe: [8, 16], vol: 40, blurb: 'incubates and operates businesses across energy, airports, mining and infrastructure' },
  'Metals & Mining': { pe: [7, 25], de: [0.2, 1.2], div: [1, 7], growth: [-5, 30], roe: [8, 22], vol: 34, blurb: 'mines and processes metals with earnings linked to global commodity cycles' },
  Chemicals: { pe: [25, 60], de: [0.1, 0.7], div: [0.2, 1.5], growth: [5, 25], roe: [12, 22], vol: 28, blurb: 'manufactures specialty chemicals, agrochemicals and fertilisers' },
  Realty: { pe: [30, 80], de: [0.1, 0.8], div: [0, 0.6], growth: [15, 45], roe: [8, 16], vol: 36, blurb: 'develops residential and commercial real estate in major Indian cities' },
  Hospitality: { pe: [45, 80], de: [0, 0.5], div: [0.2, 1], growth: [15, 40], roe: [12, 30], vol: 28, blurb: 'operates hotels, catering and travel services' },
  Textiles: { pe: [25, 70], de: [0.1, 0.8], div: [0.3, 2], growth: [5, 20], roe: [10, 35], vol: 28, blurb: 'manufactures apparel and textile products' },
  Logistics: { pe: [60, 140], de: [0, 0.3], div: [0, 0], growth: [20, 60], roe: [2, 8], vol: 36, blurb: 'provides warehousing, express parcel and supply chain services' },
  'Capital Markets': { pe: [35, 70], de: [0, 0.1], div: [0.8, 2.5], growth: [20, 45], roe: [20, 40], vol: 36, blurb: 'operates critical market infrastructure such as exchanges, depositories, brokers or AMCs' },
  'Media & Entertainment': { pe: [25, 80], de: [0, 0.5], div: [0, 1.5], growth: [-5, 20], roe: [3, 12], vol: 36, blurb: 'creates and distributes film, television and digital entertainment' },
  Aviation: { pe: [20, 40], de: [1, 3], div: [0, 0], growth: [20, 60], roe: [20, 60], vol: 32, blurb: 'operates India\'s largest airline network' },
  Consumer: { pe: [40, 90], de: [0, 0.4], div: [0, 1], growth: [10, 30], roe: [10, 25], vol: 28, blurb: 'serves Indian consumers with branded products and services' },
  'Consumer Services': { pe: [70, 140], de: [0.5, 1.5], div: [0, 0.5], growth: [5, 25], roe: [8, 20], vol: 30, blurb: 'runs quick-service restaurant chains across India' },
};

const ETF_DESCRIPTIONS: Record<string, string> = {
  'ETF - Index': 'Exchange traded fund that passively tracks a broad market index at very low cost. Trades like a stock throughout the day.',
  'ETF - Sectoral': 'Exchange traded fund that tracks a single sector index, offering concentrated sector exposure.',
  'ETF - Thematic': 'Exchange traded fund that tracks a thematic basket such as government-owned enterprises.',
  'ETF - Gold': 'Gold ETF backed by physical 99.5% purity gold held with a custodian. One unit tracks a fraction of a gram of gold.',
  'ETF - Silver': 'Silver ETF backed by physical silver, giving exposure to silver prices without storage hassles.',
  'ETF - International': 'International ETF giving exposure to overseas equities such as US technology leaders.',
  'ETF - Liquid': 'Liquid ETF investing in overnight money-market instruments; used to park idle cash with near-zero volatility.',
  'ETF - Debt': 'Target maturity debt ETF investing in AAA-rated PSU bonds maturing near the target date.',
};

function capCategoryFor(mcapCr: number): CapCategory {
  if (mcapCr >= 100000) return 'Large';
  if (mcapCr >= 30000) return 'Mid';
  return 'Small';
}

function riskFor(cap: CapCategory, vol: number): RiskLevel {
  if (cap === 'Large' && vol <= 28) return 'Low';
  if (cap === 'Small' || vol >= 36) return 'High';
  return 'Medium';
}

function buildStock(seed: StockSeed, instrument: 'EQ' | 'ETF'): Stock {
  const [ticker, name, sector, basePrice, mcapCr] = seed;
  const rng = seededRng(`stock:${ticker}`);
  const isEtf = instrument === 'ETF';
  const profile = SECTOR_PROFILES[sector] ?? SECTOR_PROFILES.Consumer;
  const cap = isEtf ? 'Large' : capCategoryFor(mcapCr);
  let vol = isEtf ? 14 : profile.vol + (cap === 'Small' ? 8 : cap === 'Mid' ? 4 : 0) + between(rng, -3, 3);
  if (isEtf) {
    if (sector.includes('Liquid')) vol = 0.5;
    else if (sector.includes('Debt')) vol = 4;
    else if (sector.includes('Silver')) vol = 24;
    else if (sector.includes('Sectoral') || sector.includes('International')) vol = 20;
  }
  const changePct = gaussian(rng) * (vol / 16) * 0.6;
  const price = roundTick(basePrice);
  const prevClose = roundTick(price / (1 + changePct / 100));
  const dayOpen = roundTick(prevClose * (1 + gaussian(rng) * 0.003));
  const dayHigh = roundTick(Math.max(price, dayOpen, prevClose) * (1 + rng() * 0.008));
  const dayLow = roundTick(Math.min(price, dayOpen, prevClose) * (1 - rng() * 0.008));
  const pe = isEtf ? 0 : round(between(rng, profile.pe[0], profile.pe[1]), 1);
  const roe = isEtf ? 0 : round(between(rng, profile.roe[0], profile.roe[1]), 1);
  const yearMove = between(rng, -0.25, 0.6);
  const week52High = roundTick(Math.max(dayHigh, price * (1 + Math.max(0.03, yearMove * 0.5 + rng() * 0.2))));
  const week52Low = roundTick(Math.min(dayLow, price * (1 - Math.max(0.05, 0.15 + rng() * 0.25))));
  const sparkline: number[] = [];
  let sp = prevClose;
  for (let i = 0; i < 20; i++) {
    sp = sp * (1 + gaussian(rng) * 0.004);
    sparkline.push(+sp.toFixed(2));
  }
  sparkline.push(price);
  const turnoverCr = isEtf ? mcapCr * between(rng, 0.001, 0.004) : mcapCr * between(rng, 0.0008, 0.004);
  const volume = Math.max(1000, Math.round((turnoverCr * 1e7) / price));
  const description = isEtf
    ? ETF_DESCRIPTIONS[sector] ?? 'Exchange traded fund listed on NSE.'
    : `${name} is a ${cap.toLowerCase()}-cap ${sector.toLowerCase()} company that ${profile.blurb}. Listed on NSE under the symbol ${ticker}.`;
  return {
    id: `st-${ticker.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
    name,
    ticker,
    exchange: 'NSE',
    instrument,
    sector,
    capCategory: cap,
    price,
    prevClose,
    dayOpen,
    dayHigh,
    dayLow,
    change: round(price - prevClose),
    changePercent: round(((price - prevClose) / prevClose) * 100),
    week52High,
    week52Low,
    volume,
    marketCapCr: mcapCr,
    peRatio: pe,
    pbRatio: isEtf ? 0 : round((pe * roe) / 100, 1),
    roe,
    eps: isEtf || pe === 0 ? 0 : round(price / pe),
    debtToEquity: isEtf ? 0 : round(between(rng, profile.de[0], profile.de[1]), 2),
    dividendYield: isEtf ? 0 : round(between(rng, profile.div[0], profile.div[1]), 2),
    profitGrowth3y: isEtf ? 0 : round(between(rng, profile.growth[0], profile.growth[1]), 1),
    risk: isEtf ? (vol <= 5 ? 'Low' : vol >= 20 ? 'Medium' : 'Low') : riskFor(cap, vol),
    volatility: round(vol, 1),
    description,
    sparkline,
  };
}

export function buildStockCatalog(): Stock[] {
  return [
    ...EQUITY_SEEDS.map((s) => buildStock(s, 'EQ')),
    ...ETF_SEEDS.map((s) => buildStock(s, 'ETF')),
  ];
}

export function stockFromIpo(ticker: string, name: string, sector: string, price: number, mcapCr: number): Stock {
  return buildStock([ticker, name, sector, price, mcapCr], 'EQ');
}

export const SECTORS = Array.from(new Set(EQUITY_SEEDS.map((s) => s[2]))).sort();
