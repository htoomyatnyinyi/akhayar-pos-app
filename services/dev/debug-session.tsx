// // app/dev/debug-session.tsx
// import React, { useEffect, useState } from "react";
// import { View, Text, ScrollView, Button } from "react-native";
// import { getOfflineDb } from "@/services/offline/db";
// import { sessions, syncOutbox } from "@/services/offline/schema";
// import { eq, and } from "drizzle-orm";
// import SafeAreaView from "react-native-safe-area-context";

// export default function DebugSessionScreen() {
//   const [sessionData, setSessionData] = useState<any[]>([]);
//   const [orderData, setOrderData] = useState<any[]>([]);
//   const [outboxData, setOutboxData] = useState<any[]>([]);

//   const loadDebugData = async () => {
//     try {
//       const db = getOfflineDb();

//       // Get all sessions
//       const allSessions = await db.select().from(sessions);
//       setSessionData(allSessions);

//       // Get orders with session IDs
//       const orders = await db.select().from(orders);
//       setOrderData(orders);

//       // Get outbox items
//       const outbox = await db.select().from(syncOutbox);
//       setOutboxData(outbox);
//     } catch (error) {
//       console.error("Failed to load debug data:", error);
//     }
//   };

//   useEffect(() => {
//     loadDebugData();
//   }, []);

//   return (
//     <SafeAreaView className="flex-1 bg-slate-950">
//       <ScrollView className="flex-1 p-4">
//         <Text className="text-2xl font-bold text-white mb-4">
//           Debug Session
//         </Text>

//         <Button title="Refresh" onPress={loadDebugData} />

//         <View className="mt-4">
//           <Text className="text-lg font-bold text-white">Sessions</Text>
//           {sessionData.map((session, index) => (
//             <View key={index} className="bg-slate-800 p-2 my-1 rounded">
//               <Text className="text-white">ID: {session.id}</Text>
//               <Text className="text-white">
//                 Remote ID: {session.remoteId || "Not synced"}
//               </Text>
//               <Text className="text-white">Status: {session.status}</Text>
//               <Text className="text-white">Store: {session.storeId}</Text>
//               <Text className="text-white">User: {session.userId}</Text>
//             </View>
//           ))}
//         </View>

//         <View className="mt-4">
//           <Text className="text-lg font-bold text-white">
//             Orders with Session
//           </Text>
//           {orderData
//             .filter((o) => o.sessionId)
//             .map((order, index) => (
//               <View key={index} className="bg-slate-800 p-2 my-1 rounded">
//                 <Text className="text-white">Order: {order.id}</Text>
//                 <Text className="text-white">
//                   Session ID: {order.sessionId}
//                 </Text>
//                 <Text className="text-white">Status: {order.status}</Text>
//               </View>
//             ))}
//         </View>

//         <View className="mt-4">
//           <Text className="text-lg font-bold text-white">Outbox Items</Text>
//           {outboxData
//             .filter((o) => o.entity === "orders")
//             .map((item, index) => (
//               <View key={index} className="bg-slate-800 p-2 my-1 rounded">
//                 <Text className="text-white">ID: {item.entityId}</Text>
//                 <Text className="text-white">Status: {item.status}</Text>
//                 <Text className="text-white">Attempts: {item.attempts}</Text>
//                 <Text className="text-white">
//                   Payload: {JSON.stringify(item.payload).slice(0, 100)}...
//                 </Text>
//               </View>
//             ))}
//         </View>
//       </ScrollView>
//     </SafeAreaView>
//   );
// }
