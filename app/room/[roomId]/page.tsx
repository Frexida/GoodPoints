"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// ランキング用のデータの型
type RankingItem = {
  name: string;
  count: number;
};

export default function RoomPage() {
  const { roomId } = useParams();
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [targetName, setTargetName] = useState(""); // いいねを送る相手の名前

  // データを集計してランキングを作る関数
  const calculateRanking = (data: any[]) => {
    const counts: { [key: string]: number } = {};

    // 1. 名前ごとに集計する
    data.forEach((item) => {
      const name = item.recipient_name || "名無し"; // 名前がない場合は「名無し」
      counts[name] = (counts[name] || 0) + 1;
    });

    // 2. 配列にして多い順に並び替える
    const sorted = Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    setRanking(sorted);
  };

  useEffect(() => {
    if (!roomId) return;

    // 初期データの取得
    const fetchInitialData = async () => {
      const { data } = await supabase
        .from("reactions")
        .select("recipient_name") // 名前だけ取得
        .eq("room_id", roomId);

      if (data) calculateRanking(data);
    };
    fetchInitialData();

    // リアルタイム監視
    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "reactions",
          filter: `room_id=eq.${roomId}`,
        },
        async () => {
          // 誰かがいいねしたら、データを再取得してランキング更新
          // (手抜き実装ですが、一番確実な方法です)
          fetchInitialData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const sendGoodPoint = async () => {
    if (!targetName.trim()) return alert("名前を入力してください！");

    // データベースに「誰宛てか」を含めて保存
    await supabase.from("reactions").insert({
      room_id: roomId,
      reaction_type: "clap",
      recipient_name: targetName, // ここが重要！
    });

    // 送信後は名前を空にする（任意）
    setTargetName("");
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-900 text-white p-4">
      <h1 className="text-xl font-bold mb-8 text-gray-400 mt-8">
        Room: {roomId}
      </h1>

      {/* 入力エリア */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-12 w-full max-w-md text-center">
        <p className="mb-4 text-lg">誰のGood Point?</p>
        <input
          type="text"
          value={targetName}
          onChange={(e) => setTargetName(e.target.value)}
          placeholder="名前 (例: Aさん)"
          className="w-full p-3 mb-4 text-black rounded text-center text-xl font-bold"
        />
        <button
          onClick={sendGoodPoint}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-2xl font-bold rounded-full transition transform active:scale-95 shadow-xl"
        >
          👍 いいね！を送る
        </button>
      </div>

      {/* ランキング表示エリア */}
      <div className="w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 border-b border-gray-700 pb-2">
          🏆 ランキング
        </h2>
        <ul className="space-y-3">
          {ranking.map((item, index) => (
            <li
              key={item.name}
              className="flex justify-between items-center bg-gray-800 p-4 rounded-lg"
            >
              <div className="flex items-center">
                <span
                  className={`text-2xl font-bold mr-4 w-8 ${
                    index === 0 ? "text-yellow-400" : "text-gray-500"
                  }`}
                >
                  {index + 1}
                </span>
                <span className="text-xl font-bold">{item.name}</span>
              </div>
              <span className="text-2xl font-mono text-indigo-400">
                {item.count} pt
              </span>
            </li>
          ))}
          {ranking.length === 0 && (
            <p className="text-gray-500 text-center">まだデータがありません</p>
          )}
        </ul>
      </div>
    </div>
  );
}
