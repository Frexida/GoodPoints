"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation"; // 1. Tool to read URL
import { supabase } from "@/lib/supabaseClient";

export default function RoomPage() {
  const { roomId } = useParams(); // Get 'team-a' from URL
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!roomId) return;

    console.log("Joining room:", roomId);

    // First, fetch the current count from DB (so it doesn't start at 0 if people already clicked)
    const fetchInitialCount = async () => {
      const { count } = await supabase
        .from("reactions")
        .select("*", { count: "exact", head: true }) // Count rows only
        .eq("room_id", roomId);

      if (count !== null) setCount(count);
    };
    fetchInitialCount();

    // Real-time Subscription
    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "reactions",
          filter: `room_id=eq.${roomId}`, // 2. Filter: Only listen to this room
        },
        (payload) => {
          setCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const sendClap = async () => {
    // Send data with the specific room_id
    await supabase
      .from("reactions")
      .insert({ room_id: roomId, reaction_type: "clap" });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-2xl font-bold mb-4 text-gray-400">Room: {roomId}</h1>

      <div className="text-8xl font-mono mb-12 font-bold text-yellow-400">
        {count}
      </div>

      <button
        onClick={sendClap}
        className="px-10 py-6 bg-indigo-600 hover:bg-indigo-500 text-3xl font-bold rounded-full transition transform active:scale-90 shadow-xl border-4 border-indigo-800"
      >
        👍 GOOD POINT!
      </button>
    </div>
  );
}
