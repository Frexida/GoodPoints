"use client"; // これを書くとブラウザ側で動くようになります

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Home() {
  const [count, setCount] = useState(0);

  // 1. リアルタイム通信の開始（ページを開いたときに実行）
  useEffect(() => {
    console.log("リアルタイム接続を開始します...");

    const channel = supabase
      .channel("realtime-reactions") // チャンネル名は適当でOK
      .on(
        "postgres_changes", // データベースの変更を監視
        { event: "INSERT", schema: "public", table: "reactions" },
        (payload) => {
          console.log("誰かが押しました！", payload);
          setCount((prev) => prev + 1); // 数字を+1する
        }
      )
      .subscribe();

    // ページを閉じたときの片付け
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 2. ボタンを押したときの処理
  const sendClap = async () => {
    // データベースにデータを1行追加する
    const { error } = await supabase
      .from("reactions")
      .insert({ room_id: "test-room", reaction_type: "clap" });

    if (error) {
      console.error("エラーが出ました:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-4xl font-bold mb-8">Good Point Counter</h1>

      <div className="text-6xl font-mono mb-12">{count}</div>

      <button
        onClick={sendClap}
        className="px-8 py-4 bg-blue-500 hover:bg-blue-400 text-2xl font-bold rounded-full transition transform active:scale-95 shadow-lg"
      >
        👏 拍手を送る
      </button>

      <p className="mt-8 text-gray-400 text-sm">
        スマホや別のタブで開いて連打してみてください
      </p>
    </div>
  );
}
