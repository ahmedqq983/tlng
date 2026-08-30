// قايمة روابط RSS بتاعة المصادر - تقدر تضيف أو تشيل منها
const RSS_SOURCES = [
  "https://www.ign.com/rss",
  "https://www.eurogamer.net/feed",
  "https://www.pcgamer.com/rss/",
  "https://www.polygon.com/rss/index.xml",
  "https://kotaku.com/rss",
  "https://www.rockpapershotgun.com/feed",
  "https://gamerant.com/feed"
];

// كلمة سر بسيطة عشان محدش يقدر يشغّل الصفحة دي غيرك أو الخدمة اللي هتحددها
const SECRET = "898";

function extractTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  if (!match) return "";
  return match[1].replace("<![CDATA[", "").replace("]]>", "").trim();
}

function extractImage(itemXml) {
  let match = itemXml.match(/<media:content[^>]*url="([^"]+)"/);
  if (match) return match[1];
  match = itemXml.match(/<enclosure[^>]*url="([^"]+)"/);
  if (match) return match[1];
  match = itemXml.match(/<img[^>]*src="([^"]+)"/);
  if (match) return match[1];
  return "";
}

function parseRSS(xml, sourceName) {
  const items = [];
  const itemMatches = xml.match(/<item[\s\S]*?<\/item>/g) || [];
  for (const itemXml of itemMatches) {
    items.push({
      title: extractTag(itemXml, "title"),
      link: extractTag(itemXml, "link"),
      pubDate: extractTag(itemXml, "pubDate"),
      image: extractImage(itemXml),
      source: sourceName
    });
  }
  return items;
}

async function fetchAllFeeds() {
  let allNews = [];
  for (const url of RSS_SOURCES) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; NewsBot/1.0)" }
      });
      const xml = await res.text();
      const sourceName = new URL(url).hostname.replace("www.", "");
      allNews = allNews.concat(parseRSS(xml, sourceName));
    } catch (err) {
      console.log("خطأ في جلب " + url + ": " + err.message);
    }
  }
  allNews.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  return allNews.slice(0, 60);
}

// النهاردة الصفحة دي بقت endpoint عادي بيتزار بـ GET، مش scheduled handler
export async function onRequestGet(context) {
  const key = new URL(context.request.url).searchParams.get("key");
  if (key !== SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }
  const news = await fetchAllFeeds();
  await context.env.NEWS_KV.put("latest_news", JSON.stringify(news));
  return new Response("Updated " + news.length + " news items");
}
