import "dotenv/config";
import path from "node:path";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaLibSql } from "@prisma/adapter-libsql";

// Resolve relative file: URLs to absolute paths
let dbUrl = process.env.DATABASE_URL!;
if (dbUrl.startsWith("file:./") || dbUrl.startsWith("file:../")) {
  const filePath = dbUrl.replace("file:", "");
  dbUrl = "file:" + path.resolve(filePath);
}

const adapter = new PrismaLibSql({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // ─── Create Castle Water client ────────────────────────

  const client = await prisma.client.upsert({
    where: { slug: "castle-water" },
    update: {},
    create: {
      name: "Castle Water",
      slug: "castle-water",
      active: true,
    },
  });

  console.log(`Created client: ${client.name} (${client.id})`);

  // ─── Client Context ────────────────────────────────────

  await prisma.clientContext.upsert({
    where: { clientId: client.id },
    update: {},
    create: {
      clientId: client.id,
      positioning:
        "Castle Water is the UK's largest independent business water retailer and a champion for the customers it serves. Their independence from wholesaler ownership means their interests are fully aligned with customers, not infrastructure companies.",
      messagePillars: JSON.stringify([
        "Customer Champion: Castle Water exists to give businesses a better deal on water -- fighting for fairer pricing, better service, and greater transparency",
        "Accuracy & Trust: Industry-leading billing accuracy (99.98% data quality), market-leading MPS score (98.26%), 20,000+ five-star Trustpilot reviews",
        "Independent Alternative: Free from wholesale group ownership, interests fully aligned with customers, willing to challenge wholesaler inefficiencies",
        "Business Resilience: Helping businesses reduce consumption, manage water costs through efficiency audits, leak detection, and smart metering",
      ]),
      toneOfVoice:
        "Direct and plain-speaking. Confident but not arrogant. Advocacy-driven -- frames issues through customer impact. Data-led -- always backs claims with specific numbers. Cautious on projections -- uses qualifying language on forward-looking topics. Never self-congratulatory. Never attacks competitors by name. Never oversimplifies regulatory complexity.",
      toneExamples: JSON.stringify([
        "The devil is very much in the detail for individual customers",
        "This defies belief. Water retailers should not expect customers to bear the burden of ongoing uncertainty due to competitors' operational failures",
        "Ofwat has not accepted this offer, which is very disappointing",
        "Completely unreasonable that some Wholesalers are already changing their approach without waiting for the consultation to complete",
        "Our pricing and margins remain unchanged. However, water wholesalers are required to implement rate increases set by the regulator, Ofwat",
      ]),
      avoidTopics: JSON.stringify([
        "Sewage discharge blame (Castle Water is a retailer not a network operator)",
        "Direct competitor attacks by name",
        "Thames Water collapse speculation beyond customer protection angles",
        "Generic sustainability claims without specific data",
        "Overpromising on savings without verified figures",
      ]),
      dataPoints: JSON.stringify([
        { metric: "MPS Score", value: "98.26%", context: "#1 among top 10 large retailers (Oct 2025)" },
        { metric: "Year-to-date MPS", value: "98.08%", context: "978,913 tasks completed on time in H1 2025" },
        { metric: "Data quality", value: "99.98%", context: "Industry-leading accuracy" },
        { metric: "Trustpilot rating", value: "4.5 stars", context: "26,695 reviews, 21,483 five-star" },
        { metric: "Customers", value: "250,000+", context: "500,000+ supply points" },
        { metric: "Leak allowances secured", value: "£1.63m", context: "In 2024 alone" },
        { metric: "Wholesaler dispute savings", value: "77% reduction", context: "In withheld settlement costs" },
        { metric: "Tariff challenge savings", value: "~£500k", context: "Challenged unfair tariff hikes" },
        { metric: "Employees", value: "450+", context: "In-house team including own meter readers" },
      ]),
      responseTemplates: JSON.stringify([
        {
          type: "regulatory",
          template: "[Opening line acknowledging the news]. For business customers, what matters is [customer impact framing]. Castle Water has consistently [reference to track record/data point]. We [action/position]. [Forward-looking statement].",
        },
        {
          type: "tariff",
          template: "The [specific change] will mean [specific impact with numbers]. The devil is in the detail for individual customers -- [explanation of variation]. Castle Water will [specific action]. We urge [regulators/wholesalers] to [specific ask].",
        },
        {
          type: "performance",
          template: "Castle Water has achieved [specific metric], confirming our position as [market-leading claim]. This reflects [what drove the result]. For our [customer count] customers, this means [tangible benefit].",
        },
      ]),
    },
  });

  console.log("Created client context");

  // ─── Spokespeople ──────────────────────────────────────

  await prisma.spokesperson.upsert({
    where: { id: "john-reynolds" },
    update: {},
    create: {
      id: "john-reynolds",
      clientId: client.id,
      name: "John Reynolds OBE",
      role: "CEO",
      expertise: JSON.stringify([
        "Tariff analysis and pricing",
        "Regulatory reform (Ofwat, REC, MOSL)",
        "Market structure and wholesaler-retailer dynamics",
        "Business growth strategy and M&A",
        "Customer advocacy and billing accuracy",
        "Thames Water / infrastructure investment",
      ]),
      mediaStyle:
        "Authoritative, analytical, uses specific data and worked examples. Comfortable being contrarian against regulators. Positions as industry translator. Conversational yet precise.",
      bio: "British investment banker, business executive and financial author. CEO of Castle Water since 2014.",
      active: true,
    },
  });

  console.log("Created spokespeople");

  // ─── Competitors ───────────────────────────────────────

  const competitors = [
    {
      id: "comp-everflow",
      name: "Everflow",
      position: "UK's fastest-growing water supplier, tech-first challenger, SME champion",
      messaging: "Water. Waste. Connectivity. All in one place. First carbon-neutral water company.",
      strengths: JSON.stringify(["Sustainability narrative", "SME focus", "Digital-first", "Integrated services", "Strong growth (21% YoY)"]),
      weaknesses: JSON.stringify(["Outsources billing", "Smaller customer base", "Less regulatory engagement"]),
      trackUrls: JSON.stringify(["https://everflowutilities.com/news"]),
    },
    {
      id: "comp-waterplus",
      name: "Water Plus",
      position: "Largest UK water retailer, JV of Severn Trent + United Utilities",
      messaging: "Sustainability leadership, Net Zero standard, comprehensive services.",
      strengths: JSON.stringify(["Scale", "Sustainability credentials", "Net Zero standard"]),
      weaknesses: JSON.stringify(["Wholesaler-owned", "Customer service reputation", "Billing accuracy concerns"]),
      trackUrls: JSON.stringify(["https://www.water-plus.co.uk/news"]),
    },
    {
      id: "comp-wave",
      name: "Wave Utilities",
      position: "Multi-utility provider, Water Retailer of the Year 2025, 300,000+ businesses",
      messaging: "High industry recognition, sustainability, superior customer service.",
      strengths: JSON.stringify(["Awards record", "Multi-utility offering", "Customer service reputation"]),
      weaknesses: JSON.stringify(["Not independent (Anglian Water JV origin)", "Less billing accuracy focus"]),
      trackUrls: JSON.stringify(["https://www.wave-utilities.co.uk/advice-guidance/news"]),
    },
    {
      id: "comp-businessstream",
      name: "Business Stream",
      position: "Scottish Water subsidiary, Regulatory Advocate, vocal on market reform",
      messaging: "20% water consumption reduction pledge. High-profile CEO Jo Dow.",
      strengths: JSON.stringify(["Policy messaging", "High-profile CEO", "Scottish market strength"]),
      weaknesses: JSON.stringify(["Wholesaler-owned", "Less billing accuracy focus", "Limited England presence"]),
      trackUrls: JSON.stringify(["https://www.business-stream.co.uk/news"]),
    },
  ];

  for (const comp of competitors) {
    await prisma.competitor.upsert({
      where: { id: comp.id },
      update: {},
      create: { clientId: client.id, ...comp },
    });
  }

  console.log("Created competitors");

  // ─── Topics ────────────────────────────────────────────

  const topics = [
    { name: "Water billing accuracy", authority: "primary", keywords: ["billing accuracy", "water bill error", "estimated bill", "meter reading", "MPS score", "market performance standards"] },
    { name: "Business water tariffs", authority: "primary", keywords: ["water tariff", "water price increase", "wholesale charges", "April tariff", "water bill increase business"] },
    { name: "Wholesaler-retailer dynamics", authority: "primary", keywords: ["wholesaler dispute", "wholesale retail code", "CMOS", "settlement", "credit support"] },
    { name: "Water retail market performance", authority: "primary", keywords: ["water retailer performance", "MPS", "BR-MeX", "market performance framework", "MOSL data"] },
    { name: "Retail Exit Code reform", authority: "primary", keywords: ["retail exit code", "REC reform", "REC review", "price protection", "Ofwat retail"] },
    { name: "Smart metering", authority: "primary", keywords: ["smart meter water", "AMI", "AMR", "automatic meter reading", "smart metering rollout"] },
    { name: "Customer service in water", authority: "primary", keywords: ["water customer service", "water complaint", "CCW complaint", "Trustpilot water"] },
    { name: "UK water regulation", authority: "secondary", keywords: ["Ofwat", "water regulation", "water bill consultation", "water policy", "DEFRA water"] },
    { name: "Water efficiency for business", authority: "secondary", keywords: ["water efficiency business", "water saving", "leak detection", "water audit", "trade effluent"] },
    { name: "Thames Water crisis", authority: "secondary", keywords: ["Thames Water", "Thames restructuring", "Thames debt", "Thames sewage"] },
    { name: "Regional business water", authority: "secondary", keywords: ["North West water business", "Humberside water", "Scotland water business"] },
    { name: "Business utility costs", authority: "secondary", keywords: ["business utility costs", "SME bills", "cost of doing business", "utility price increase"] },
    { name: "AI and water demand", authority: "emerging", keywords: ["data centre water", "AI water consumption", "data center water usage"] },
    { name: "Water scarcity", authority: "emerging", keywords: ["water scarcity UK", "drought business", "hosepipe ban", "water shortage"] },
    { name: "Cunliffe Review", authority: "emerging", keywords: ["Cunliffe Review", "water industry governance", "regulatory reform water"] },
  ];

  for (const topic of topics) {
    await prisma.topic.create({
      data: {
        clientId: client.id,
        name: topic.name,
        authority: topic.authority,
        keywords: JSON.stringify(topic.keywords),
      },
    });
  }

  console.log("Created topics");

  // ─── Sources ───────────────────────────────────────────

  const sources = [
    { name: "Water Magazine", type: "rss", url: "https://www.watermagazine.co.uk/feed/", category: "trade", config: null },
    { name: "Utility Week", type: "rss", url: "https://utilityweek.co.uk/feed/", category: "trade", config: null },
    { name: "Water Briefing", type: "rss", url: "https://www.waterbriefing.org/rss", category: "trade", config: null },
    { name: "Ofwat Publications", type: "rss", url: "https://www.ofwat.gov.uk/feed/", category: "regulatory", config: null },
    { name: "GOV.UK DEFRA", type: "rss", url: "https://www.gov.uk/government/organisations/department-for-environment-food-rural-affairs.atom", category: "regulatory", config: null },
    { name: "Environment Agency", type: "rss", url: "https://www.gov.uk/government/organisations/environment-agency.atom", category: "regulatory", config: null },
    { name: "BusinessLive", type: "rss", url: "https://www.business-live.co.uk/rss.xml", category: "national", config: null },
    { name: "The Herald Business", type: "rss", url: "https://www.heraldscotland.com/business/rss/", category: "regional", config: null },
    { name: "The Scotsman Business", type: "rss", url: "https://www.scotsman.com/business/rss", category: "regional", config: null },
    { name: "The Manufacturer", type: "rss", url: "https://www.themanufacturer.com/feed/", category: "trade", config: null },
    {
      name: "NewsAPI: Castle Water", type: "news_api", url: null, category: "national",
      config: JSON.stringify({ query: '"Castle Water" OR "business water retailer"', pageSize: 20 }),
    },
    {
      name: "NewsAPI: Water Industry", type: "news_api", url: null, category: "trade",
      config: JSON.stringify({ query: '"water retail" OR "Ofwat" OR "business water" OR "water tariff"', pageSize: 20 }),
    },
    {
      name: "NewsAPI: Competitors", type: "news_api", url: null, category: "competitor",
      config: JSON.stringify({ query: '"Everflow water" OR "Water Plus" OR "Wave utilities" OR "Business Stream water"', pageSize: 15 }),
    },
    {
      name: "Google Trends: Business Water", type: "search_trends", url: null, category: "trade",
      config: JSON.stringify({ keyword: "business water supplier", geo: "GB", timeRange: "now 7-d" }),
    },
    {
      name: "Google Trends: Water Bills", type: "search_trends", url: null, category: "trade",
      config: JSON.stringify({ keyword: "water bill increase", geo: "GB", timeRange: "now 7-d" }),
    },
    {
      name: "Twitter: Water Industry", type: "social", url: null, category: "social",
      config: JSON.stringify({ twitter: { query: '"Castle Water" OR #BusinessWater OR #WaterRetail', maxResults: 25 } }),
    },
    {
      name: "Reddit: UK Business Water", type: "social", url: null, category: "social",
      config: JSON.stringify({ reddit: { subreddit: "UKPersonalFinance", query: "water bill business", limit: 15 } }),
    },
    {
      name: "Eventbrite: Water & Utilities", type: "events", url: null, category: "events",
      config: JSON.stringify({ query: "water utility industry UK", location: "United Kingdom" }),
    },
    // Water-specific trade & regulatory sources
    { name: "WWT Online", type: "rss", url: "https://wwtonline.co.uk/rss", category: "trade", config: null },
    { name: "Environment Analyst", type: "rss", url: "https://environment-analyst.com/rss", category: "trade", config: null },
    { name: "CCW (Consumer Council for Water)", type: "rss", url: "https://www.ccw.org.uk/feed/", category: "regulatory", config: null },
    { name: "Water UK", type: "rss", url: "https://www.water.org.uk/news/feed/", category: "trade", config: null },
    // Competitor feeds (may not be valid RSS — pipeline will handle failures gracefully)
    { name: "Everflow News", type: "rss", url: "https://everflowutilities.com/news", category: "competitor", config: null },
    { name: "Water Plus News", type: "rss", url: "https://www.water-plus.co.uk/news", category: "competitor", config: null },
    { name: "Wave Utilities News", type: "rss", url: "https://www.wave-utilities.co.uk/advice-guidance/news", category: "competitor", config: null },
    { name: "Business Stream News", type: "rss", url: "https://www.business-stream.co.uk/news", category: "competitor", config: null },
    // Google Trends — water industry keywords
    {
      name: "Google Trends - Water Industry",
      type: "google_trends",
      url: null,
      config: JSON.stringify({ keywords: ["water bills UK", "water quality", "water company", "business water", "water regulation", "Ofwat"] }),
      category: "search_trends",
    },
    // Companies House — Castle Water + key competitors
    {
      name: "Companies House - Castle Water",
      type: "companies_house",
      url: null,
      config: JSON.stringify({ companyName: "Castle Water", companyNumber: "SC475583" }),
      category: "regulatory",
    },
    {
      name: "Companies House - SES Water",
      type: "companies_house",
      url: null,
      config: JSON.stringify({ companyName: "SES Water", companyNumber: "02447875" }),
      category: "regulatory",
    },
    {
      name: "Companies House - Pennon Group",
      type: "companies_house",
      url: null,
      config: JSON.stringify({ companyName: "Pennon Group", companyNumber: "02366640" }),
      category: "regulatory",
    },
    // Ofwat publications-specific feed (distinct from the main Ofwat feed above)
    { name: "Ofwat - Consultations & Reports", type: "rss", url: "https://www.ofwat.gov.uk/publications/feed/", category: "regulatory", config: null },
    // UK Parliament — water industry debates
    { name: "UK Parliament - Water", type: "rss", url: "https://hansard.parliament.uk/search/Debates.rss?searchTerm=water+industry&house=Commons", category: "regulatory", config: null },
    // Google News — brand monitoring for Share of Voice
    { name: "Google News - Castle Water", type: "google_news", url: null, config: JSON.stringify({ query: '"Castle Water"' }), category: "brand_monitoring" },
    { name: "Google News - SES Water", type: "google_news", url: null, config: JSON.stringify({ query: '"SES Water" OR "Sutton and East Surrey Water"' }), category: "brand_monitoring" },
    { name: "Google News - Pennon Group", type: "google_news", url: null, config: JSON.stringify({ query: '"Pennon Group" OR "South West Water"' }), category: "brand_monitoring" },
    { name: "Google News - Anglian Water", type: "google_news", url: null, config: JSON.stringify({ query: '"Anglian Water"' }), category: "brand_monitoring" },
    { name: "Google News - Wave Water", type: "google_news", url: null, config: JSON.stringify({ query: '"Wave" water retailer UK' }), category: "brand_monitoring" },
    { name: "Google News - Water Industry UK", type: "google_news", url: null, config: JSON.stringify({ query: 'water industry UK regulation' }), category: "industry_news" },
  ];

  for (const source of sources) {
    await prisma.source.create({
      data: {
        clientId: client.id,
        name: source.name,
        type: source.type,
        url: source.url,
        config: source.config,
        category: source.category,
        active: true,
      },
    });
  }

  console.log("Created sources");

  // ─── Create Food & Drink Scotland client ────────────────

  const fds = await prisma.client.upsert({
    where: { slug: "food-drink-scotland" },
    update: {},
    create: {
      name: "Food & Drink Scotland",
      slug: "food-drink-scotland",
      active: true,
    },
  });

  console.log(`Created client: ${fds.name} (${fds.id})`);

  // ─── Food & Drink Scotland Client Context ─────────────

  await prisma.clientContext.upsert({
    where: { clientId: fds.id },
    update: {},
    create: {
      clientId: fds.id,
      positioning:
        "Food & Drink Scotland (foodanddrink.scot) is Scotland's national trade body for the food and drink industry — the country's largest manufacturing sector, worth over £15bn annually. They champion Scottish producers, drive export growth, support innovation, and position Scotland as a Land of Food and Drink on the global stage.",
      messagePillars: JSON.stringify([
        "Scotland's Larder: Scotland produces world-class food and drink — from whisky and salmon to craft beer, artisan cheese, and plant-based innovation",
        "Export Powerhouse: Scottish food and drink exports exceed £7bn, with growth targets across Europe, North America, and Asia-Pacific markets",
        "Innovation & Sustainability: Supporting producers to lead on net-zero, reduce food waste, and develop new products that meet changing consumer demands",
        "Industry Voice: Representing over 1,000 businesses from farm to fork, influencing policy on trade, skills, regulation, and market access",
      ]),
      toneOfVoice:
        "Authoritative and proud but not boastful. Collaborative — speaks for the whole industry, not just big players. Evidence-based — uses real data and case studies. Optimistic but realistic about challenges (Brexit trade friction, cost pressures, skills shortages). Never partisan or political. Always inclusive of Scotland's diverse food and drink landscape.",
      toneExamples: JSON.stringify([
        "Scotland's food and drink sector is showing remarkable resilience, with export growth outpacing the UK average",
        "From Shetland salmon to Ayrshire cheese, our producers are winning on the world stage",
        "The industry faces real headwinds — rising costs, trade barriers, workforce gaps — but the response from Scottish businesses has been extraordinary",
        "Innovation isn't just for tech companies. Scottish food and drink producers are leading the way in sustainability and new product development",
        "We're calling on the Scottish Government to prioritise trade support for food and drink — our largest manufacturing sector",
      ]),
      avoidTopics: JSON.stringify([
        "Partisan political positions on Scottish independence or constitutional matters",
        "Favouring individual brands over the collective industry",
        "Downplaying genuine challenges facing producers (costs, trade friction, labour)",
        "Making export projections without data backing",
        "Commenting on individual company controversies",
      ]),
      dataPoints: JSON.stringify([
        { metric: "Industry value", value: "£15bn+", context: "Scotland's largest manufacturing sector" },
        { metric: "Export value", value: "£7.1bn", context: "2025 figures, growing year-on-year" },
        { metric: "Businesses represented", value: "1,000+", context: "From micro-producers to global brands" },
        { metric: "Employment", value: "115,000+", context: "Jobs across Scotland in food and drink" },
        { metric: "Whisky exports", value: "£4.9bn", context: "Single largest contributor to Scottish exports" },
        { metric: "Salmon exports", value: "£600m+", context: "Scotland is world's 3rd largest salmon producer" },
        { metric: "Growth target", value: "£30bn by 2030", context: "Ambition 2030 industry strategy" },
      ]),
      responseTemplates: JSON.stringify([
        {
          type: "export_news",
          template: "This [development] reflects the growing international appetite for Scottish food and drink. [Specific data point]. Our producers are [relevant positioning]. Food & Drink Scotland is [supporting action].",
        },
        {
          type: "policy_response",
          template: "The [policy/regulation] has significant implications for Scotland's food and drink sector. [Impact framing with data]. We're calling for [specific ask]. The industry employs [employment data] and contributes [economic data] — policy must support this vital sector.",
        },
        {
          type: "innovation",
          template: "Scottish producers continue to lead on [innovation area]. [Case study/example]. This shows [wider point about the sector]. Food & Drink Scotland's [programme/initiative] is helping businesses [outcome].",
        },
      ]),
    },
  });

  console.log("Created Food & Drink Scotland client context");

  // ─── Food & Drink Scotland Spokespeople ────────────────

  await prisma.spokesperson.upsert({
    where: { id: "fds-ceo" },
    update: {},
    create: {
      id: "fds-ceo",
      clientId: fds.id,
      name: "Iain Baxter",
      role: "Chief Executive",
      expertise: JSON.stringify([
        "Scottish food and drink industry strategy",
        "Export growth and international trade",
        "Government and policy engagement",
        "Industry collaboration and partnerships",
        "Ambition 2030 growth targets",
      ]),
      mediaStyle:
        "Measured and authoritative. Speaks for the whole industry. Comfortable with broadcast and print. Uses data to reinforce points. Diplomatic on political topics. Strong on economic impact messaging.",
      bio: "Leads Scotland's national food and drink trade body. Oversees industry strategy, export development, and government relations for Scotland's largest manufacturing sector.",
      active: true,
    },
  });

  console.log("Created Food & Drink Scotland spokespeople");

  // ─── Food & Drink Scotland Competitors / Peer Bodies ───

  const fdsCompetitors = [
    {
      id: "comp-scotland-food-drink-recovery",
      name: "Scotland Food & Drink Recovery Plan",
      position: "Scottish Government-led recovery programme for the food and drink sector post-COVID and post-Brexit.",
      messaging: "Government support for Scotland's food and drink resilience.",
      strengths: JSON.stringify(["Government funding", "Policy alignment", "Cross-sector coordination"]),
      weaknesses: JSON.stringify(["Bureaucratic pace", "Broad focus dilutes impact", "Political dependency"]),
      trackUrls: JSON.stringify(["https://www.gov.scot/policies/food-and-drink/"]),
    },
    {
      id: "comp-food-drink-federation",
      name: "Food & Drink Federation (UK)",
      position: "The UK-wide trade body for food and drink manufacturers. Larger scale but less Scotland-specific.",
      messaging: "The voice of UK food and drink manufacturing.",
      strengths: JSON.stringify(["UK-wide reach", "Strong Westminster lobbying", "Large membership base", "Comprehensive research"]),
      weaknesses: JSON.stringify(["Less Scotland-specific focus", "London-centric", "Competing priorities across UK nations"]),
      trackUrls: JSON.stringify(["https://www.fdf.org.uk/news.aspx"]),
    },
    {
      id: "comp-scotch-whisky-association",
      name: "Scotch Whisky Association",
      position: "Trade body for Scotland's whisky industry. Dominant voice on spirits exports and regulation.",
      messaging: "Protecting and promoting Scotch whisky worldwide.",
      strengths: JSON.stringify(["Iconic brand association", "Powerful export data", "Strong government relationships", "Global recognition"]),
      weaknesses: JSON.stringify(["Single-category focus", "Dominated by large distillers", "Less inclusive of small producers"]),
      trackUrls: JSON.stringify(["https://www.scotch-whisky.org.uk/newsroom/"]),
    },
    {
      id: "comp-quality-meat-scotland",
      name: "Quality Meat Scotland",
      position: "Industry body for the Scottish red meat sector. Strong on provenance and quality messaging.",
      messaging: "Scotch Beef, Scotch Lamb — naturally reared, quality assured.",
      strengths: JSON.stringify(["Strong PGI branding", "Consumer trust", "Farm-to-fork traceability", "Export growth"]),
      weaknesses: JSON.stringify(["Narrow sector focus", "Sustainability scrutiny on red meat", "Smaller media footprint"]),
      trackUrls: JSON.stringify(["https://www.qmscotland.co.uk/news"]),
    },
  ];

  for (const comp of fdsCompetitors) {
    await prisma.competitor.upsert({
      where: { id: comp.id },
      update: {},
      create: { clientId: fds.id, ...comp },
    });
  }

  console.log("Created Food & Drink Scotland peer bodies");

  // ─── Food & Drink Scotland Topics ──────────────────────

  const fdsTopics = [
    { name: "Scottish food & drink exports", authority: "primary", keywords: ["Scottish exports", "Scotland food drink exports", "food export growth", "Scottish trade", "export markets Scotland"] },
    { name: "Scotch whisky industry", authority: "primary", keywords: ["Scotch whisky", "whisky exports", "whisky industry", "single malt", "whisky tariffs", "scotch whisky association"] },
    { name: "Scottish salmon & seafood", authority: "primary", keywords: ["Scottish salmon", "salmon farming Scotland", "seafood exports", "aquaculture Scotland", "fishing industry Scotland"] },
    { name: "Sustainability & net zero", authority: "primary", keywords: ["food sustainability", "net zero food", "sustainable agriculture Scotland", "food waste Scotland", "green food production"] },
    { name: "Brexit trade impact", authority: "primary", keywords: ["Brexit food trade", "UK EU food trade", "trade barriers food", "customs food", "SPS checks food"] },
    { name: "Scottish food innovation", authority: "primary", keywords: ["food innovation Scotland", "plant-based Scotland", "alternative protein", "food tech Scotland", "new food products"] },
    { name: "Tourism & hospitality", authority: "secondary", keywords: ["Scotland tourism food", "food tourism", "Scottish hospitality", "restaurant industry Scotland", "Visit Scotland food"] },
    { name: "Skills & workforce", authority: "secondary", keywords: ["food drink jobs Scotland", "food manufacturing workforce", "skills shortage food", "apprenticeships food drink"] },
    { name: "Scottish Government food policy", authority: "primary", keywords: ["Scottish Government food", "food policy Scotland", "Good Food Nation", "agriculture Scotland policy"] },
    { name: "Craft & artisan producers", authority: "emerging", keywords: ["artisan food Scotland", "craft producers Scotland", "Scottish gin", "craft beer Scotland", "small producers Scotland"] },
  ];

  for (const topic of fdsTopics) {
    await prisma.topic.create({
      data: {
        clientId: fds.id,
        name: topic.name,
        authority: topic.authority,
        keywords: JSON.stringify(topic.keywords),
      },
    });
  }

  console.log("Created Food & Drink Scotland topics");

  // ─── Food & Drink Scotland Sources ─────────────────────

  const fdsSources = [
    { name: "Food & Drink Scotland News", type: "rss", url: "https://foodanddrink.scot/news/rss/", category: "owned", config: null },
    { name: "The Grocer", type: "rss", url: "https://www.thegrocer.co.uk/rss", category: "trade", config: null },
    { name: "Food Manufacture", type: "rss", url: "https://www.foodmanufacture.co.uk/rss", category: "trade", config: null },
    { name: "The Herald Scotland", type: "rss", url: "https://www.heraldscotland.com/business/rss/", category: "regional", config: null },
    { name: "The Scotsman", type: "rss", url: "https://www.scotsman.com/business/rss", category: "regional", config: null },
    { name: "BBC Scotland Business", type: "rss", url: "https://feeds.bbci.co.uk/news/scotland/business/rss.xml", category: "regional", config: null },
    { name: "Google News - Scottish Food Drink", type: "google_news", url: null, config: JSON.stringify({ query: '"Scottish food and drink" OR "Scotland food industry"' }), category: "industry_news" },
    { name: "Google News - Scotch Whisky", type: "google_news", url: null, config: JSON.stringify({ query: '"Scotch whisky" exports OR industry' }), category: "brand_monitoring" },
    { name: "Google News - Scottish Salmon", type: "google_news", url: null, config: JSON.stringify({ query: '"Scottish salmon" OR "salmon farming Scotland"' }), category: "brand_monitoring" },
    { name: "Google News - Food Exports UK", type: "google_news", url: null, config: JSON.stringify({ query: 'UK food exports trade' }), category: "industry_news" },
    { name: "Google News - Food & Drink Federation", type: "google_news", url: null, config: JSON.stringify({ query: '"Food and Drink Federation" OR "FDF"' }), category: "brand_monitoring" },
    {
      name: "Google Trends - Scottish Food",
      type: "google_trends",
      url: null,
      config: JSON.stringify({ keywords: ["Scottish food", "Scotch whisky", "Scottish salmon", "Scottish gin", "Scotland exports"] }),
      category: "search_trends",
    },
  ];

  for (const source of fdsSources) {
    await prisma.source.create({
      data: {
        clientId: fds.id,
        name: source.name,
        type: source.type,
        url: source.url,
        config: source.config,
        category: source.category,
        active: true,
      },
    });
  }

  console.log("Created Food & Drink Scotland sources");

  console.log("\n--- Seed complete! ---");
  console.log(`Castle Water client ID: ${client.id}`);
  console.log(`Food & Drink Scotland client ID: ${fds.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
