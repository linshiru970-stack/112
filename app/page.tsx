import { getChatGPTUser } from "./chatgpt-auth";
import { PracticeClient } from "./practice-client";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();
  return <PracticeClient displayName={user?.displayName ?? "你的學習進度"} />;
}
