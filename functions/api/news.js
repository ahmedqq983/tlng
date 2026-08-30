// دي بتشتغل لما index.html يعمل fetch("/api/news")
export async function onRequest(context) {
  const data = await context.env.NEWS_KV.get("latest_news");
  return new Response(data || "[]", {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
