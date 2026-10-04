import { FundCategory, FundRisk, MutualFund, Stock } from '../types';
import { between, gaussian, round, seededRng } from '../lib/random';

// [name, amc, category, subCategory, nav, 1y, 3y, 5y CAGR %, expense %, AUM ₹Cr, risk, min SIP]
// Illustrative figures for simulation only — not live NAVs or official returns.
type FundSeed = [string, string, FundCategory, string, number, number, number, number, number, number, FundRisk, number];

const FUND_SEEDS: FundSeed[] = [
  // Equity — Large Cap
  ['ICICI Prudential Bluechip Fund', 'ICICI Prudential', 'Equity', 'Large Cap', 118.4, 9.8, 18.2, 21.4, 0.88, 69800, 'Very High', 100],
  ['Nippon India Large Cap Fund', 'Nippon India', 'Equity', 'Large Cap', 98.6, 8.9, 19.6, 23.1, 0.68, 41700, 'Very High', 100],
  ['SBI Bluechip Fund', 'SBI', 'Equity', 'Large Cap', 102.3, 7.4, 14.9, 19.2, 0.81, 52400, 'Very High', 500],
  ['HDFC Large Cap Fund', 'HDFC', 'Equity', 'Large Cap', 1205.6, 6.8, 16.1, 20.4, 0.98, 38200, 'Very High', 100],
  ['Mirae Asset Large Cap Fund', 'Mirae Asset', 'Equity', 'Large Cap', 118.9, 6.2, 12.8, 17.6, 0.55, 39800, 'Very High', 99],
  ['Canara Robeco Bluechip Equity Fund', 'Canara Robeco', 'Equity', 'Large Cap', 68.4, 8.1, 14.6, 18.8, 0.49, 16200, 'Very High', 100],
  // Equity — Mid Cap
  ['Motilal Oswal Midcap Fund', 'Motilal Oswal', 'Equity', 'Mid Cap', 112.8, 14.6, 31.2, 34.8, 0.62, 33600, 'Very High', 500],
  ['HDFC Mid-Cap Opportunities Fund', 'HDFC', 'Equity', 'Mid Cap', 205.4, 10.9, 26.4, 30.2, 0.77, 79700, 'Very High', 100],
  ['Kotak Emerging Equity Fund', 'Kotak Mahindra', 'Equity', 'Mid Cap', 142.1, 9.6, 22.8, 28.1, 0.41, 53400, 'Very High', 100],
  ['Nippon India Growth Fund', 'Nippon India', 'Equity', 'Mid Cap', 4420.5, 11.2, 25.9, 30.9, 0.73, 38100, 'Very High', 100],
  ['Edelweiss Mid Cap Fund', 'Edelweiss', 'Equity', 'Mid Cap', 108.7, 12.4, 27.1, 31.6, 0.41, 10200, 'Very High', 100],
  ['Axis Midcap Fund', 'Axis', 'Equity', 'Mid Cap', 121.3, 8.4, 20.6, 25.4, 0.54, 31400, 'Very High', 100],
  // Equity — Small Cap
  ['Quant Small Cap Fund', 'Quant', 'Equity', 'Small Cap', 268.4, 5.2, 27.4, 42.6, 0.64, 28500, 'Very High', 1000],
  ['Nippon India Small Cap Fund', 'Nippon India', 'Equity', 'Small Cap', 182.6, 4.8, 25.6, 36.9, 0.68, 64800, 'Very High', 100],
  ['SBI Small Cap Fund', 'SBI', 'Equity', 'Small Cap', 192.4, 2.1, 18.4, 28.6, 0.71, 35500, 'Very High', 500],
  ['Axis Small Cap Fund', 'Axis', 'Equity', 'Small Cap', 118.2, 6.4, 20.9, 30.1, 0.56, 25800, 'Very High', 100],
  ['Bandhan Small Cap Fund', 'Bandhan', 'Equity', 'Small Cap', 52.6, 9.8, 31.9, 33.4, 0.42, 13900, 'Very High', 100],
  ['Tata Small Cap Fund', 'Tata', 'Equity', 'Small Cap', 44.8, 3.6, 22.1, 32.7, 0.33, 11400, 'Very High', 150],
  // Equity — Flexi / Multi / Focused / Value / Large & Mid
  ['Parag Parikh Flexi Cap Fund', 'PPFAS', 'Equity', 'Flexi Cap', 92.4, 11.6, 22.4, 26.1, 0.63, 113000, 'Very High', 1000],
  ['HDFC Flexi Cap Fund', 'HDFC', 'Equity', 'Flexi Cap', 2120.8, 10.8, 22.9, 28.4, 0.71, 81900, 'Very High', 100],
  ['Kotak Flexicap Fund', 'Kotak Mahindra', 'Equity', 'Flexi Cap', 92.1, 8.2, 18.3, 21.6, 0.58, 54600, 'Very High', 100],
  ['JM Flexicap Fund', 'JM Financial', 'Equity', 'Flexi Cap', 112.6, 3.9, 24.1, 27.4, 0.48, 5900, 'Very High', 100],
  ['Nippon India Multi Cap Fund', 'Nippon India', 'Equity', 'Multi Cap', 312.4, 8.6, 25.1, 31.2, 0.75, 46200, 'Very High', 100],
  ['Quant Active Fund', 'Quant', 'Equity', 'Multi Cap', 712.6, -2.4, 17.2, 28.9, 0.62, 10500, 'Very High', 1000],
  ['SBI Focused Equity Fund', 'SBI', 'Equity', 'Focused', 392.6, 11.4, 16.2, 20.6, 0.74, 38500, 'Very High', 500],
  ['ICICI Prudential Focused Equity Fund', 'ICICI Prudential', 'Equity', 'Focused', 102.5, 12.1, 23.4, 26.4, 0.58, 12400, 'Very High', 100],
  ['ICICI Prudential Value Discovery Fund', 'ICICI Prudential', 'Equity', 'Value', 498.2, 9.1, 21.8, 27.6, 1.05, 54300, 'Very High', 100],
  ['Nippon India Value Fund', 'Nippon India', 'Equity', 'Value', 248.7, 6.5, 24.1, 28.9, 1.04, 8900, 'Very High', 100],
  ['Mirae Asset Large & Midcap Fund', 'Mirae Asset', 'Equity', 'Large & Mid Cap', 162.8, 7.3, 18.2, 24.5, 0.58, 41200, 'Very High', 99],
  ['Bandhan Core Equity Fund', 'Bandhan', 'Equity', 'Large & Mid Cap', 142.6, 10.2, 25.8, 27.3, 0.66, 10200, 'Very High', 100],
  // Equity — ELSS
  ['Mirae Asset ELSS Tax Saver Fund', 'Mirae Asset', 'Equity', 'ELSS', 52.8, 6.9, 17.6, 22.1, 0.58, 26400, 'Very High', 500],
  ['Quant ELSS Tax Saver Fund', 'Quant', 'Equity', 'ELSS', 412.6, -1.6, 17.8, 30.4, 0.73, 11600, 'Very High', 500],
  ['SBI Long Term Equity Fund', 'SBI', 'Equity', 'ELSS', 468.4, 7.8, 25.4, 27.2, 0.94, 30500, 'Very High', 500],
  ['DSP ELSS Tax Saver Fund', 'DSP', 'Equity', 'ELSS', 152.9, 8.6, 21.3, 24.9, 0.72, 17500, 'Very High', 500],
  ['Parag Parikh ELSS Tax Saver Fund', 'PPFAS', 'Equity', 'ELSS', 32.4, 10.1, 19.8, 24.6, 0.62, 5600, 'Very High', 500],
  // Equity — Sectoral / Thematic
  ['ICICI Prudential Technology Fund', 'ICICI Prudential', 'Equity', 'Sectoral - Technology', 232.6, 2.8, 13.9, 26.8, 1.02, 14700, 'Very High', 100],
  ['SBI Healthcare Opportunities Fund', 'SBI', 'Equity', 'Sectoral - Pharma', 482.4, 12.6, 28.4, 26.9, 0.94, 4100, 'Very High', 500],
  ['Nippon India Banking & Financial Services Fund', 'Nippon India', 'Equity', 'Sectoral - Banking', 672.1, 11.8, 19.2, 24.1, 1.06, 7000, 'Very High', 100],
  ['ICICI Prudential Infrastructure Fund', 'ICICI Prudential', 'Equity', 'Thematic - Infrastructure', 212.6, 4.6, 29.6, 36.4, 1.12, 7900, 'Very High', 100],
  ['HDFC Defence Fund', 'HDFC', 'Equity', 'Thematic - Defence', 25.8, 18.4, 42.6, 0, 0.82, 6300, 'Very High', 100],
  ['Tata Digital India Fund', 'Tata', 'Equity', 'Sectoral - Technology', 56.2, 0.8, 12.4, 25.9, 0.38, 12400, 'Very High', 150],
  ['Mirae Asset Great Consumer Fund', 'Mirae Asset', 'Equity', 'Thematic - Consumption', 102.4, 6.1, 19.9, 23.1, 0.43, 4600, 'Very High', 99],
  ['Quant PSU Fund', 'Quant', 'Equity', 'Thematic - PSU', 18.6, -6.2, 0, 0, 0.62, 1100, 'Very High', 1000],
  // Index funds
  ['UTI Nifty 50 Index Fund', 'UTI', 'Index', 'Nifty 50', 172.4, 8.4, 14.6, 18.9, 0.18, 22200, 'Very High', 500],
  ['HDFC Index Fund Nifty 50 Plan', 'HDFC', 'Index', 'Nifty 50', 238.6, 8.3, 14.5, 18.7, 0.2, 21400, 'Very High', 100],
  ['ICICI Prudential Nifty 50 Index Fund', 'ICICI Prudential', 'Index', 'Nifty 50', 252.4, 8.3, 14.5, 18.8, 0.17, 12700, 'Very High', 100],
  ['Navi Nifty 50 Index Fund', 'Navi', 'Index', 'Nifty 50', 15.8, 8.5, 14.7, 0, 0.06, 3100, 'Very High', 100],
  ['UTI Nifty Next 50 Index Fund', 'UTI', 'Index', 'Nifty Next 50', 24.8, 3.2, 18.9, 21.4, 0.35, 5300, 'Very High', 500],
  ['Motilal Oswal Nifty Midcap 150 Index Fund', 'Motilal Oswal', 'Index', 'Nifty Midcap 150', 38.6, 7.6, 23.4, 29.1, 0.29, 2700, 'Very High', 500],
  ['Motilal Oswal Nifty Smallcap 250 Index Fund', 'Motilal Oswal', 'Index', 'Nifty Smallcap 250', 34.2, 2.6, 22.1, 31.4, 0.35, 900, 'Very High', 500],
  ['HDFC Index Fund BSE Sensex Plan', 'HDFC', 'Index', 'BSE Sensex', 762.8, 7.4, 13.6, 17.8, 0.2, 8400, 'Very High', 100],
  ['Bandhan Nifty Alpha 50 Index Fund', 'Bandhan', 'Index', 'Smart Beta', 14.2, -4.8, 21.6, 0, 0.32, 800, 'Very High', 100],
  ['UTI Nifty200 Momentum 30 Index Fund', 'UTI', 'Index', 'Smart Beta', 22.4, -6.1, 19.8, 24.2, 0.42, 8900, 'Very High', 500],
  // International / FoF
  ['Motilal Oswal Nasdaq 100 FoF', 'Motilal Oswal', 'International', 'US Equity FoF', 42.6, 22.4, 28.6, 21.4, 0.2, 6200, 'Very High', 500],
  ['Mirae Asset NYSE FANG+ ETF FoF', 'Mirae Asset', 'International', 'US Equity FoF', 32.8, 34.6, 39.2, 0, 0.06, 2100, 'Very High', 1000],
  ['Franklin India Feeder - Franklin US Opportunities Fund', 'Franklin Templeton', 'International', 'US Equity FoF', 82.4, 18.2, 20.1, 14.8, 0.64, 3600, 'Very High', 500],
  ['Edelweiss Greater China Equity Off-shore Fund', 'Edelweiss', 'International', 'Asia Equity FoF', 52.4, 24.6, 4.2, 5.8, 1.32, 200, 'Very High', 100],
  // Commodity
  ['SBI Gold Fund', 'SBI', 'Commodity', 'Gold FoF', 32.6, 38.2, 24.6, 14.9, 0.1, 4200, 'High', 500],
  ['HDFC Gold ETF Fund of Fund', 'HDFC', 'Commodity', 'Gold FoF', 31.4, 37.9, 24.4, 14.7, 0.17, 4600, 'High', 100],
  ['Nippon India Silver ETF FoF', 'Nippon India', 'Commodity', 'Silver FoF', 24.8, 46.2, 28.1, 0, 0.27, 2400, 'Very High', 100],
  // Hybrid
  ['ICICI Prudential Equity & Debt Fund', 'ICICI Prudential', 'Hybrid', 'Aggressive Hybrid', 412.6, 10.4, 20.8, 25.4, 0.99, 43200, 'Very High', 100],
  ['SBI Equity Hybrid Fund', 'SBI', 'Hybrid', 'Aggressive Hybrid', 312.4, 11.2, 14.6, 17.1, 0.72, 77000, 'Very High', 500],
  ['HDFC Balanced Advantage Fund', 'HDFC', 'Hybrid', 'Balanced Advantage', 548.6, 6.8, 20.4, 24.1, 0.76, 101800, 'Very High', 100],
  ['ICICI Prudential Balanced Advantage Fund', 'ICICI Prudential', 'Hybrid', 'Balanced Advantage', 78.4, 9.6, 14.1, 15.2, 0.86, 65700, 'Moderately High', 100],
  ['Kotak Balanced Advantage Fund', 'Kotak Mahindra', 'Hybrid', 'Balanced Advantage', 22.8, 7.1, 12.6, 13.4, 0.58, 17200, 'Moderately High', 100],
  ['ICICI Prudential Multi-Asset Fund', 'ICICI Prudential', 'Hybrid', 'Multi Asset Allocation', 812.4, 13.1, 20.6, 25.3, 0.68, 64800, 'Very High', 100],
  ['Quant Multi Asset Fund', 'Quant', 'Hybrid', 'Multi Asset Allocation', 148.2, 4.2, 18.9, 26.8, 0.62, 3800, 'Very High', 1000],
  ['Kotak Equity Arbitrage Fund', 'Kotak Mahindra', 'Hybrid', 'Arbitrage', 38.2, 7.2, 7.0, 5.9, 0.44, 69400, 'Low', 100],
  ['Tata Arbitrage Fund', 'Tata', 'Hybrid', 'Arbitrage', 14.8, 7.1, 6.9, 5.8, 0.31, 15200, 'Low', 150],
  ['HDFC Equity Savings Fund', 'HDFC', 'Hybrid', 'Equity Savings', 68.2, 7.6, 10.8, 11.6, 0.94, 5800, 'Moderately High', 100],
  ['SBI Conservative Hybrid Fund', 'SBI', 'Hybrid', 'Conservative Hybrid', 78.4, 8.2, 10.4, 11.9, 1.04, 9900, 'Moderately High', 500],
  // Debt
  ['Parag Parikh Liquid Fund', 'PPFAS', 'Debt', 'Liquid', 1482.6, 6.9, 6.8, 5.4, 0.16, 3100, 'Low to Moderate', 1000],
  ['HDFC Liquid Fund', 'HDFC', 'Debt', 'Liquid', 5182.4, 7.1, 6.9, 5.5, 0.2, 63400, 'Low to Moderate', 100],
  ['SBI Liquid Fund', 'SBI', 'Debt', 'Liquid', 4142.8, 7.0, 6.9, 5.4, 0.19, 68100, 'Low to Moderate', 500],
  ['Aditya Birla Sun Life Liquid Fund', 'Aditya Birla Sun Life', 'Debt', 'Liquid', 428.6, 7.1, 6.9, 5.5, 0.21, 49500, 'Low to Moderate', 500],
  ['Nippon India Overnight Fund', 'Nippon India', 'Debt', 'Overnight', 138.4, 6.4, 6.4, 5.0, 0.08, 8100, 'Low', 100],
  ['HDFC Overnight Fund', 'HDFC', 'Debt', 'Overnight', 3812.6, 6.4, 6.4, 5.0, 0.1, 12400, 'Low', 100],
  ['ICICI Prudential Money Market Fund', 'ICICI Prudential', 'Debt', 'Money Market', 382.4, 7.6, 7.2, 5.9, 0.21, 28900, 'Low to Moderate', 100],
  ['Aditya Birla Sun Life Savings Fund', 'Aditya Birla Sun Life', 'Debt', 'Ultra Short Duration', 548.2, 7.7, 7.3, 6.2, 0.34, 18600, 'Low to Moderate', 1000],
  ['HDFC Short Term Debt Fund', 'HDFC', 'Debt', 'Short Duration', 32.6, 8.2, 7.4, 6.6, 0.4, 16200, 'Moderate', 100],
  ['ICICI Prudential Corporate Bond Fund', 'ICICI Prudential', 'Debt', 'Corporate Bond', 30.2, 8.4, 7.6, 6.8, 0.35, 31400, 'Moderate', 100],
  ['Aditya Birla Sun Life Corporate Bond Fund', 'Aditya Birla Sun Life', 'Debt', 'Corporate Bond', 112.4, 8.6, 7.7, 6.9, 0.33, 25400, 'Moderate', 1000],
  ['Kotak Banking and PSU Debt Fund', 'Kotak Mahindra', 'Debt', 'Banking & PSU', 64.8, 8.3, 7.4, 6.5, 0.38, 6000, 'Moderate', 100],
  ['SBI Magnum Gilt Fund', 'SBI', 'Debt', 'Gilt', 68.2, 8.8, 8.1, 7.0, 0.46, 11400, 'Moderate', 500],
  ['ICICI Prudential Gilt Fund', 'ICICI Prudential', 'Debt', 'Gilt', 102.6, 8.9, 8.2, 7.2, 0.55, 7300, 'Moderate', 100],
  ['Bandhan Dynamic Bond Fund', 'Bandhan', 'Debt', 'Dynamic Bond', 36.4, 8.1, 7.2, 6.1, 0.62, 2800, 'Moderate', 100],
  ['Axis Credit Risk Fund', 'Axis', 'Debt', 'Credit Risk', 22.6, 9.1, 7.8, 7.0, 0.82, 400, 'Moderately High', 100],
  ['Edelweiss CRISIL IBX 50:50 Gilt Plus SDL Apr 2037 Index Fund', 'Edelweiss', 'Debt', 'Target Maturity', 12.8, 9.2, 8.4, 0, 0.17, 2400, 'Moderate', 100],
  // Solution oriented
  ['HDFC Retirement Savings Fund - Equity Plan', 'HDFC', 'Solution Oriented', 'Retirement', 52.8, 8.2, 21.4, 26.9, 0.92, 6600, 'Very High', 100],
  ['Tata Retirement Savings Fund - Progressive Plan', 'Tata', 'Solution Oriented', 'Retirement', 72.4, 5.6, 17.2, 19.4, 0.64, 2100, 'Very High', 150],
  ['ICICI Prudential Child Care Fund - Gift Plan', 'ICICI Prudential', 'Solution Oriented', 'Children', 342.6, 9.4, 18.2, 19.8, 1.48, 1400, 'Very High', 100],
  ['SBI Magnum Children\'s Benefit Fund - Investment Plan', 'SBI', 'Solution Oriented', 'Children', 42.6, 10.6, 26.1, 0, 0.88, 3800, 'Very High', 500],
];

const MANAGERS: Record<string, string[]> = {
  'ICICI Prudential': ['Sankaran Naren', 'Anish Tawakley', 'Manish Banthia', 'Ihab Dalwai'],
  'Nippon India': ['Sailesh Raj Bhan', 'Samir Rachh', 'Dhrumil Shah', 'Vivek Sharma'],
  SBI: ['R. Srinivasan', 'Rama Iyer Srinivasan', 'Dinesh Balachandran', 'Rajeev Radhakrishnan'],
  HDFC: ['Roshi Jain', 'Chirag Setalvad', 'Gopal Agrawal', 'Anil Bamboli'],
  'Mirae Asset': ['Neelesh Surana', 'Gaurav Misra', 'Ankit Jain'],
  'Canara Robeco': ['Shridatta Bhandwaldar', 'Vishal Mishra'],
  'Motilal Oswal': ['Niket Shah', 'Ajay Khandelwal', 'Swapnil Mayekar'],
  'Kotak Mahindra': ['Harsha Upadhyaya', 'Atul Bhole', 'Deepak Agrawal'],
  Edelweiss: ['Trideep Bhattacharya', 'Dhawal Dalal', 'Bhavesh Jain'],
  Axis: ['Shreyash Devalkar', 'Mayank Hyanki', 'Devang Shah'],
  Quant: ['Sandeep Tandon', 'Ankit Pande', 'Vasav Sahgal'],
  Bandhan: ['Manish Gunwani', 'Suyash Choudhary', 'Nemish Sheth'],
  Tata: ['Chandraprakash Padiyar', 'Meeta Shetty', 'Murthy Nagarajan'],
  PPFAS: ['Rajeev Thakkar', 'Raunak Onkar', 'Raj Mehta'],
  'JM Financial': ['Satish Ramanathan', 'Asit Bhandarkar'],
  DSP: ['Rohit Singhania', 'Vikram Chopra'],
  UTI: ['Sharwan Kumar Goyal', 'Ayush Jain'],
  Navi: ['Aditya Mulki'],
  'Franklin Templeton': ['Sandeep Manam', 'Kunal Agrawal'],
  'Aditya Birla Sun Life': ['Kaustubh Gupta', 'Sunaina da Cunha', 'Mahesh Patil'],
};

const SUBCATEGORY_INFO: Record<string, { desc: string; benchmark: string }> = {
  'Large Cap': { desc: 'Invests at least 80% in India\'s top 100 companies by market capitalisation. Offers relatively stable equity returns with lower volatility than mid and small caps.', benchmark: 'Nifty 100 TRI' },
  'Mid Cap': { desc: 'Invests at least 65% in companies ranked 101–250 by market cap. Higher growth potential with higher volatility — suited to 7+ year horizons.', benchmark: 'Nifty Midcap 150 TRI' },
  'Small Cap': { desc: 'Invests at least 65% in companies ranked beyond 250 by market cap. Highest growth potential and highest volatility among diversified equity funds.', benchmark: 'Nifty Smallcap 250 TRI' },
  'Flexi Cap': { desc: 'Invests across large, mid and small caps with full flexibility for the fund manager to shift allocation as opportunities arise.', benchmark: 'Nifty 500 TRI' },
  'Multi Cap': { desc: 'Mandated to invest at least 25% each in large, mid and small caps, giving balanced exposure across the market-cap spectrum.', benchmark: 'Nifty 500 Multicap 50:25:25 TRI' },
  Focused: { desc: 'Concentrated portfolio of at most 30 high-conviction stocks. Returns depend heavily on the fund manager\'s stock selection.', benchmark: 'Nifty 500 TRI' },
  Value: { desc: 'Follows a value investing strategy — buying fundamentally strong businesses trading below their intrinsic worth.', benchmark: 'Nifty 500 TRI' },
  'Large & Mid Cap': { desc: 'Invests at least 35% each in large-cap and mid-cap stocks, blending stability with growth.', benchmark: 'Nifty LargeMidcap 250 TRI' },
  ELSS: { desc: 'Equity Linked Savings Scheme eligible for deduction up to ₹1.5 lakh under Section 80C (old regime). Has a mandatory 3-year lock-in — the shortest among 80C options.', benchmark: 'Nifty 500 TRI' },
  'Sectoral - Technology': { desc: 'Invests predominantly in technology and IT services companies. Concentrated sector bet with cyclical returns.', benchmark: 'BSE Teck TRI' },
  'Sectoral - Pharma': { desc: 'Invests in pharmaceutical, hospital and healthcare companies. Defensive sector with export and domestic growth drivers.', benchmark: 'BSE Healthcare TRI' },
  'Sectoral - Banking': { desc: 'Invests in banks, NBFCs, insurers and other financial services businesses.', benchmark: 'Nifty Financial Services TRI' },
  'Thematic - Infrastructure': { desc: 'Invests in companies benefiting from India\'s infrastructure build-out — construction, capital goods, power and cement.', benchmark: 'Nifty Infrastructure TRI' },
  'Thematic - Defence': { desc: 'Invests in defence and aerospace manufacturers benefiting from indigenisation and export orders.', benchmark: 'Nifty India Defence TRI' },
  'Thematic - Consumption': { desc: 'Invests in businesses driven by Indian consumer spending — FMCG, autos, retail and durables.', benchmark: 'Nifty India Consumption TRI' },
  'Thematic - PSU': { desc: 'Invests in public sector undertakings across energy, banking, defence and infrastructure.', benchmark: 'BSE PSU TRI' },
  'Nifty 50': { desc: 'Passive index fund replicating the Nifty 50 — India\'s 50 largest companies. Ultra-low cost and no fund-manager risk.', benchmark: 'Nifty 50 TRI' },
  'Nifty Next 50': { desc: 'Passive fund replicating the Nifty Next 50 — the 50 companies just below the Nifty 50, often future large caps.', benchmark: 'Nifty Next 50 TRI' },
  'Nifty Midcap 150': { desc: 'Passive fund replicating the Nifty Midcap 150 index at a fraction of the cost of active mid-cap funds.', benchmark: 'Nifty Midcap 150 TRI' },
  'Nifty Smallcap 250': { desc: 'Passive fund replicating the Nifty Smallcap 250 index.', benchmark: 'Nifty Smallcap 250 TRI' },
  'BSE Sensex': { desc: 'Passive fund replicating the BSE Sensex of 30 blue-chip companies.', benchmark: 'BSE Sensex TRI' },
  'Smart Beta': { desc: 'Rules-based factor index fund (momentum / alpha) that tilts towards stocks with strong recent performance.', benchmark: 'Factor Index TRI' },
  'US Equity FoF': { desc: 'Fund of funds investing in US-listed equities, giving exposure to global technology leaders and USD diversification.', benchmark: 'Nasdaq 100 / S&P 500 TRI (INR)' },
  'Asia Equity FoF': { desc: 'Fund of funds investing in Greater China and Asian equities.', benchmark: 'MSCI Golden Dragon Index' },
  'Gold FoF': { desc: 'Invests in gold ETFs backed by physical gold. A hedge against inflation and currency depreciation.', benchmark: 'Domestic price of Gold' },
  'Silver FoF': { desc: 'Invests in silver ETFs backed by physical silver.', benchmark: 'Domestic price of Silver' },
  'Aggressive Hybrid': { desc: 'Invests 65–80% in equities and the rest in debt, cushioning drawdowns while staying growth-oriented.', benchmark: 'CRISIL Hybrid 35+65 Aggressive Index' },
  'Balanced Advantage': { desc: 'Dynamically shifts between equity and debt based on valuations — buys more equity when markets are cheap.', benchmark: 'Nifty 50 Hybrid Composite Debt 50:50 Index' },
  'Multi Asset Allocation': { desc: 'Invests in at least three asset classes — equity, debt and gold/silver — for all-weather diversification.', benchmark: 'Nifty 200 TRI (65%) + Debt (25%) + Gold (10%)' },
  Arbitrage: { desc: 'Earns the spread between cash and futures prices. Debt-like returns with equity taxation — ideal for short-term parking.', benchmark: 'Nifty 50 Arbitrage Index' },
  'Equity Savings': { desc: 'Mix of equity, arbitrage and debt designed for moderate returns with low volatility.', benchmark: 'Nifty Equity Savings Index' },
  'Conservative Hybrid': { desc: 'Invests 75–90% in debt and 10–25% in equity for steady income with a growth kicker.', benchmark: 'CRISIL Hybrid 85+15 Conservative Index' },
  Liquid: { desc: 'Invests in money-market instruments maturing within 91 days. Near-zero volatility and T+1 redemption — a better alternative to a savings account.', benchmark: 'CRISIL Liquid Debt A-I Index' },
  Overnight: { desc: 'Invests in securities maturing overnight. Lowest-risk mutual fund category.', benchmark: 'CRISIL Liquid Overnight Index' },
  'Money Market': { desc: 'Invests in money-market instruments maturing within one year.', benchmark: 'CRISIL Money Market A-I Index' },
  'Ultra Short Duration': { desc: 'Debt fund with portfolio duration of 3–6 months. Slightly higher yield than liquid funds.', benchmark: 'CRISIL Ultra Short Duration Debt A-I Index' },
  'Short Duration': { desc: 'Debt fund with portfolio duration of 1–3 years, balancing yield and interest-rate risk.', benchmark: 'CRISIL Short Duration Debt A-II Index' },
  'Corporate Bond': { desc: 'Invests at least 80% in AA+ and above rated corporate bonds.', benchmark: 'CRISIL Corporate Debt A-II Index' },
  'Banking & PSU': { desc: 'Invests at least 80% in debt of banks, PSUs and public financial institutions.', benchmark: 'CRISIL Banking and PSU Debt A-II Index' },
  Gilt: { desc: 'Invests at least 80% in government securities. No credit risk, but sensitive to interest-rate changes.', benchmark: 'CRISIL Dynamic Gilt Index' },
  'Dynamic Bond': { desc: 'Actively manages duration across interest-rate cycles.', benchmark: 'CRISIL Dynamic Bond A-III Index' },
  'Credit Risk': { desc: 'Invests at least 65% in AA and below rated bonds for higher yield, with higher default risk.', benchmark: 'CRISIL Credit Risk Debt B-II Index' },
  'Target Maturity': { desc: 'Passive debt index fund holding G-Secs and SDLs until a fixed maturity date — predictable returns if held to maturity.', benchmark: 'CRISIL IBX 50:50 Gilt Plus SDL Index' },
  Retirement: { desc: 'Solution-oriented retirement fund with a 5-year lock-in (or till retirement age, whichever is earlier).', benchmark: 'Nifty 500 TRI' },
  Children: { desc: 'Solution-oriented fund for children\'s goals with a 5-year lock-in (or till the child turns 18).', benchmark: 'CRISIL Hybrid 35+65 Aggressive Index' },
};

const DEBT_HOLDINGS = [
  '7.18% GOI 2033', '7.10% GOI 2034', '7.26% GOI 2033', '6.79% GOI 2034', '91 Day T-Bill', '182 Day T-Bill', '364 Day T-Bill',
  'NABARD CD', 'HDFC Bank CD', 'SIDBI CP', 'REC Ltd NCD', 'Power Finance Corp NCD', 'Bajaj Finance CP', 'LIC Housing Finance NCD',
  'Maharashtra SDL 2032', 'Tamil Nadu SDL 2033', 'TREPS / Reverse Repo', 'Small Industries Dev Bank NCD', 'Axis Bank CD', 'Kotak Mahindra Prime CP',
];

const US_HOLDINGS = ['Apple Inc.', 'Microsoft Corp', 'NVIDIA Corp', 'Amazon.com Inc.', 'Alphabet Inc.', 'Meta Platforms', 'Broadcom Inc.', 'Tesla Inc.', 'Netflix Inc.', 'Costco Wholesale'];
const CHINA_HOLDINGS = ['Tencent Holdings', 'Alibaba Group', 'Meituan', 'BYD Co', 'Xiaomi Corp', 'NetEase Inc.', 'Ping An Insurance', 'JD.com'];

const SECTOR_FOR_SUB: Record<string, string[]> = {
  'Sectoral - Technology': ['Information Technology', 'Consumer Tech'],
  'Sectoral - Pharma': ['Pharma & Healthcare'],
  'Sectoral - Banking': ['Banking', 'Financial Services', 'Insurance'],
  'Thematic - Infrastructure': ['Capital Goods', 'Infrastructure', 'Cement', 'Power'],
  'Thematic - Defence': ['Defence', 'Capital Goods'],
  'Thematic - Consumption': ['FMCG', 'Consumer Durables', 'Retail', 'Automobile'],
};

const PSU_TICKERS = ['SBIN', 'NTPC', 'ONGC', 'COALINDIA', 'POWERGRID', 'HAL', 'BEL', 'PFC', 'RECLTD', 'BANKBARODA', 'IOC', 'GAIL', 'BHEL', 'NHPC'];

function pickWeights(rng: () => number, n: number, total: number): number[] {
  const raw = Array.from({ length: n }, () => 0.5 + rng());
  raw.sort((a, b) => b - a);
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map((r) => round((r / sum) * total, 1));
}

function holdingsFor(seed: FundSeed, stocks: Stock[], rng: () => number): { name: string; percentage: number }[] {
  const [, , category, sub] = seed;
  const eq = stocks.filter((s) => s.instrument === 'EQ');
  const byCap = (cap: string) => eq.filter((s) => s.capCategory === cap).sort((a, b) => b.marketCapCr - a.marketCapCr);
  const sample = <T,>(arr: T[], n: number, topBias = true): T[] => {
    const pool = topBias ? arr.slice(0, Math.max(n * 3, n)) : [...arr];
    const out: T[] = [];
    while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    return out;
  };
  let names: string[] = [];
  let total = 45;
  if (category === 'Debt') {
    names = sample(DEBT_HOLDINGS, 6, false);
    total = 70;
  } else if (category === 'Commodity') {
    return sub.startsWith('Silver')
      ? [{ name: 'Nippon India Silver ETF', percentage: 99.4 }, { name: 'TREPS / Cash', percentage: 0.6 }]
      : [{ name: 'Gold ETF units (physical gold)', percentage: 99.2 }, { name: 'TREPS / Cash', percentage: 0.8 }];
  } else if (category === 'International') {
    names = sample(sub.startsWith('Asia') ? CHINA_HOLDINGS : US_HOLDINGS, 6, false);
    total = 55;
  } else if (sub === 'Arbitrage') {
    names = [...sample(byCap('Large'), 4).map((s) => `${s.name} (hedged)`), 'TREPS / Reverse Repo', '91 Day T-Bill'];
    total = 40;
  } else {
    let universe: Stock[] = byCap('Large');
    if (sub.includes('Mid')) universe = sub.includes('Large') ? [...byCap('Large'), ...byCap('Mid')] : byCap('Mid');
    if (sub.includes('Small')) universe = byCap('Small');
    if (sub === 'Flexi Cap' || sub === 'Multi Cap' || sub === 'Value' || sub === 'Focused' || sub === 'ELSS' || sub === 'Smart Beta' || category === 'Solution Oriented')
      universe = [...byCap('Large').slice(0, 30), ...byCap('Mid').slice(0, 15), ...byCap('Small').slice(0, 8)];
    if (SECTOR_FOR_SUB[sub]) universe = eq.filter((s) => SECTOR_FOR_SUB[sub].includes(s.sector)).sort((a, b) => b.marketCapCr - a.marketCapCr);
    if (sub === 'Thematic - PSU') universe = eq.filter((s) => PSU_TICKERS.includes(s.ticker));
    const isIndex = category === 'Index' && sub !== 'Smart Beta';
    names = (isIndex ? universe.slice(0, 7) : sample(universe, 7)).map((s) => s.name);
    total = isIndex ? 52 : SECTOR_FOR_SUB[sub] ? 60 : 42;
    if (category === 'Hybrid') {
      names = [...names.slice(0, 4), ...sample(DEBT_HOLDINGS, 2, false)];
      total = 38;
    }
  }
  const weights = pickWeights(rng, names.length, total);
  return names.map((name, i) => ({ name, percentage: weights[i] }));
}

function volatilityFor(category: FundCategory, sub: string): number {
  if (category === 'Debt') {
    if (sub === 'Overnight' || sub === 'Liquid') return 0.25;
    if (sub === 'Money Market' || sub === 'Ultra Short Duration') return 0.6;
    if (sub === 'Gilt' || sub === 'Dynamic Bond' || sub === 'Target Maturity') return 3.5;
    return 1.8;
  }
  if (sub === 'Arbitrage') return 0.6;
  if (sub === 'Equity Savings' || sub === 'Conservative Hybrid') return 5;
  if (category === 'Hybrid') return 10;
  if (category === 'Commodity') return sub.startsWith('Silver') ? 24 : 14;
  if (category === 'International') return 20;
  if (sub.includes('Small')) return 22;
  if (sub.includes('Mid')) return 19;
  if (sub.startsWith('Sectoral') || sub.startsWith('Thematic') || sub === 'Smart Beta') return 21;
  return 15;
}

function exitLoadFor(category: FundCategory, sub: string): { pct: number; days: number } {
  if (sub === 'ELSS' || category === 'Solution Oriented') return { pct: 0, days: 0 };
  if (sub === 'Liquid') return { pct: 0.007, days: 7 };
  if (sub === 'Arbitrage') return { pct: 0.25, days: 30 };
  if (category === 'Debt') return sub === 'Credit Risk' ? { pct: 1, days: 365 } : { pct: 0, days: 0 };
  if (category === 'Index') return { pct: 0, days: 0 };
  if (category === 'Commodity') return { pct: 1, days: 15 };
  return { pct: 1, days: 365 };
}

export function buildFundCatalog(stocks: Stock[]): MutualFund[] {
  return FUND_SEEDS.map((seed) => {
    const [name, amc, category, sub, nav, c1, c3, c5, er, aum, risk, minSip] = seed;
    const rng = seededRng(`fund:${name}`);
    const vol = volatilityFor(category, sub);
    const dayMove = (gaussian(rng) * vol) / 16 / 100;
    const info = SUBCATEGORY_INFO[sub] ?? { desc: 'Open-ended mutual fund scheme.', benchmark: 'Nifty 500 TRI' };
    const exit = exitLoadFor(category, sub);
    const pool = MANAGERS[amc] ?? ['Fund Manager'];
    const managers = pool.slice(0, Math.max(1, Math.min(pool.length, 1 + Math.floor(rng() * 2))));
    const score = (c3 || c1) * 0.6 + (c5 || c3 || c1) * 0.4 - er * 4;
    const rating = category === 'Debt' ? Math.min(5, Math.max(2, Math.round(between(rng, 3, 5.4)))) : Math.min(5, Math.max(1, Math.round(score / 6)));
    const lockInYears = sub === 'ELSS' ? 3 : category === 'Solution Oriented' ? 5 : 0;
    return {
      id: `mf-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`,
      name: `${name} Direct Growth`,
      amc,
      category,
      subCategory: sub,
      nav,
      prevNav: round(nav / (1 + dayMove), 4),
      cagr1y: c1,
      cagr3y: c3,
      cagr5y: c5,
      expenseRatio: er,
      aumCr: aum,
      riskRating: risk,
      rating,
      minSip,
      minLumpsum: minSip >= 1000 ? 1000 : minSip <= 100 ? 100 : 500,
      exitLoadPct: exit.pct,
      exitLoadDays: exit.days,
      lockInYears,
      benchmark: info.benchmark,
      volatility: vol,
      description: `${info.desc} Managed by ${amc} Mutual Fund.`,
      managers,
      holdings: holdingsFor(seed, stocks, rng),
    };
  });
}

export function fundExpectedReturn(fund: MutualFund): number {
  const r = fund.cagr5y || fund.cagr3y || fund.cagr1y;
  // Cap extreme historic returns so long simulations stay sensible
  return Math.max(3, Math.min(r, 16));
}

export const FUND_CATEGORIES: FundCategory[] = ['Equity', 'Debt', 'Hybrid', 'Index', 'Commodity', 'International', 'Solution Oriented'];
