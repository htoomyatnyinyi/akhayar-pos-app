import React from "react";
import { View, Text, TouchableOpacity, SafeAreaView, ActivityIndicator, ScrollView } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSync } from "@/services/offline/syncManager";

export default function SyncScreen() {
  const {
    isOnline,
    isSyncing,
    isLoading,
    syncStatus,
    syncError,
    queueCount,
    failedCount,
    syncProgress,
    lastSyncAt,
    sync,
    retry,
    refresh
  } = useSync();

  const handleSyncNow = () => {
    sync({ force: true });
  };

  const handleRetry = () => {
    retry();
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-900 pt-12">
      <View className="px-5 py-4">
        <Text className="text-3xl font-black text-white mb-1">Synchronization</Text>
        <Text className="text-slate-400 text-sm font-medium">Manage offline data and connectivity</Text>
      </View>

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Status Card */}
        <View className="bg-slate-800 rounded-2xl p-5 mb-5 border border-slate-700/50 shadow-sm mt-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-slate-200 font-bold text-lg">Network Status</Text>
            <View className={`px-3 py-1 rounded-full flex-row items-center ${isOnline ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
              <MaterialIcons name={isOnline ? 'wifi' : 'wifi-off'} size={14} color={isOnline ? '#10b981' : '#f43f5e'} />
              <Text className={`ml-1 font-bold text-xs ${isOnline ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </Text>
            </View>
          </View>
          
          <View className="flex-row items-center justify-between">
            <Text className="text-slate-400">Last Synced</Text>
            <Text className="text-slate-200 font-medium">
              {lastSyncAt ? new Date(lastSyncAt).toLocaleTimeString() : 'Never'}
            </Text>
          </View>

          {syncError && (
            <View className="mt-4 p-3 bg-rose-500/10 rounded-xl border border-rose-500/20">
              <Text className="text-rose-400 text-sm">{syncError}</Text>
            </View>
          )}
        </View>

        {/* Sync Stats */}
        <View className="flex-row justify-between mb-5">
          <View className="flex-1 bg-slate-800 rounded-2xl p-4 mr-2 border border-slate-700/50 items-center">
            <MaterialIcons name="cloud-upload" size={28} color="#38bdf8" className="mb-2" />
            <Text className="text-3xl font-black text-white mt-2">{queueCount ?? 0}</Text>
            <Text className="text-slate-400 text-xs mt-1">Pending</Text>
          </View>
          
          <View className="flex-1 bg-slate-800 rounded-2xl p-4 ml-2 border border-slate-700/50 items-center">
            <MaterialIcons name="error-outline" size={28} color="#f43f5e" className="mb-2" />
            <Text className="text-3xl font-black text-white mt-2">{failedCount ?? 0}</Text>
            <Text className="text-slate-400 text-xs mt-1">Failed</Text>
          </View>
        </View>

        {/* Progress Bar (Visible only when syncing) */}
        {isSyncing && (
          <View className="bg-slate-800 rounded-2xl p-5 mb-5 border border-slate-700/50">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-slate-300 font-semibold">Sync in progress...</Text>
              <Text className="text-sky-400 font-bold">{Math.round(syncProgress)}%</Text>
            </View>
            <View className="h-2 w-full bg-slate-700 rounded-full overflow-hidden">
              <View 
                className="h-full bg-sky-500 rounded-full" 
                style={{ width: `${syncProgress}%` }} 
              />
            </View>
          </View>
        )}

        {/* Actions */}
        <Text className="text-slate-400 font-semibold mb-3 ml-1 mt-2 uppercase tracking-wider text-xs">Actions</Text>
        
        <TouchableOpacity 
          className={`flex-row items-center justify-center p-4 rounded-2xl mb-3 ${isOnline && !isSyncing ? 'bg-sky-500' : 'bg-slate-700 opacity-70'}`}
          onPress={handleSyncNow}
          disabled={!isOnline || isSyncing}
          activeOpacity={0.8}
        >
          {isSyncing ? (
             <ActivityIndicator color="white" size="small" />
          ) : (
            <MaterialIcons name="sync" size={20} color="white" />
          )}
          <Text className="text-white font-bold text-lg ml-2">
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Text>
        </TouchableOpacity>

        {failedCount > 0 && (
          <TouchableOpacity 
            className={`flex-row items-center justify-center p-4 rounded-2xl mb-3 border border-rose-500/50 ${(isOnline && !isSyncing) ? 'bg-rose-500/20' : 'bg-slate-800 opacity-50'}`}
            onPress={handleRetry}
            disabled={!isOnline || isSyncing}
            activeOpacity={0.8}
          >
            <MaterialIcons name="refresh" size={20} color={isOnline && !isSyncing ? '#f43f5e' : '#64748b'} />
            <Text className={`font-bold text-lg ml-2 ${isOnline && !isSyncing ? 'text-rose-400' : 'text-slate-500'}`}>
              Retry Failed Items
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          className="flex-row items-center justify-center p-4 rounded-2xl border border-slate-700 bg-slate-800"
          onPress={refresh}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <MaterialIcons name="refresh" size={20} color="#94a3b8" />
          <Text className="text-slate-400 font-bold text-lg ml-2">
            Refresh Stats
          </Text>
        </TouchableOpacity>
        
      </ScrollView>
    </SafeAreaView>
  );
}
