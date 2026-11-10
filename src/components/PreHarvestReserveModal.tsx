import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createReservationApi, HarvestReservation } from '@/services/reservation-service';
import { useToast } from '@/context/toast-context';

interface PreHarvestReserveModalProps {
  visible: boolean;
  onClose: () => void;
  post: {
    id: string | number;
    cropName?: string | null;
    content?: string;
    authorName?: string;
    isVerified?: boolean;
    pricePerUnit?: number | null;
    unit?: string;
    expectedHarvestDate?: string | null;
    availableQuantity?: number | null;
    reservedQuantity?: number;
    pickupHub?: string | null;
    location?: string;
  } | null;
  onSuccess: (reservation: HarvestReservation) => void;
}

export default function PreHarvestReserveModal({
  visible,
  onClose,
  post,
  onSuccess,
}: PreHarvestReserveModalProps) {
  const { showToast } = useToast();
  const [quantity, setQuantity] = useState<number>(5);
  const [customInput, setCustomInput] = useState<string>('5');
  const [buyerNotes, setBuyerNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!post) return null;

  const cropName =
    post.cropName ||
    post.content?.split('\n')[0].replace(/^[#*-\s]+/, '').slice(0, 45) ||
    'Fresh Produce';
  const price = Number(post.pricePerUnit) || 35;
  const unit = post.unit || 'kg';
  const pickupLocation = post.pickupHub || post.location || 'Bogo City Public Market Hub';
  const harvestDate = post.expectedHarvestDate || 'Upcoming Harvest';

  // Calculate days left
  let daysLeftText = 'Harvest Soon';
  try {
    if (post.expectedHarvestDate) {
      const target = new Date(post.expectedHarvestDate);
      const diffDays = Math.ceil((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        daysLeftText = `${diffDays} days until harvest`;
      } else if (diffDays === 0) {
        daysLeftText = 'Harvesting Today!';
      } else {
        daysLeftText = 'Freshly Harvested';
      }
    }
  } catch {}

  const totalAmount = (quantity * price).toFixed(2);

  const handleAdjustQuantity = (delta: number) => {
    const next = Math.max(1, quantity + delta);
    setQuantity(next);
    setCustomInput(String(next));
  };

  const handleInputChange = (text: string) => {
    setCustomInput(text);
    const parsed = parseFloat(text);
    if (!isNaN(parsed) && parsed > 0) {
      setQuantity(parsed);
    }
  };

  const handleSubmit = async () => {
    if (quantity <= 0) {
      showToast('Please enter at least 1 unit to reserve.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createReservationApi({
        postId: post.id,
        quantity,
        buyerNotes: buyerNotes.trim(),
      });

      if (res.success) {
        showToast(`Harvest Reserved! Advance booking for ${cropName} confirmed.`, 'success');
        onSuccess(res.reservation);
        onClose();
      } else {
        showToast(res.message || 'Could not place reservation.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Unable to connect to server.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-black/60 justify-end"
      >
        <View className="bg-white dark:bg-[#1e2022] rounded-t-3xl max-h-[90%] overflow-hidden shadow-2xl">
          {/* Header */}
          <View className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2.5">
              <View className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 items-center justify-center">
                <Ionicons name="leaf" size={20} color="#237227" />
              </View>
              <View>
                <Text className="text-base font-bold text-slate-900 dark:text-white">
                  Reserve Harvest Batch
                </Text>
                <Text className="text-xs text-slate-500 dark:text-slate-400">
                  Direct from Verified Northern Cebu Farmer
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center"
            >
              <Ionicons name="close" size={18} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView className="p-6 space-y-5" showsVerticalScrollIndicator={false}>
            {/* Batch Info Card */}
            <View className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-2">
                  <Text className="text-base font-bold text-slate-900 dark:text-white">
                    {cropName}
                  </Text>
                  <View className="flex-row items-center gap-1.5 mt-1">
                    <Text className="text-xs text-slate-600 dark:text-slate-300">
                      Farmer: {post.authorName || 'Local Producer'}
                    </Text>
                    {post.isVerified && (
                      <Ionicons name="checkmark-circle" size={14} color="#237227" />
                    )}
                  </View>
                </View>

                {/* Countdown pill */}
                <View className="bg-emerald-700 px-3 py-1.5 rounded-full items-center justify-center shadow-xs">
                  <Text className="text-[11px] font-bold text-white">
                    {daysLeftText}
                  </Text>
                </View>
              </View>

              <View className="mt-3 pt-3 border-t border-emerald-200/50 dark:border-emerald-900/50 flex-row items-center justify-between text-xs">
                <View className="flex-row items-center gap-1 text-slate-600 dark:text-slate-400">
                  <Ionicons name="location-outline" size={14} color="#237227" />
                  <Text className="text-[11px] text-slate-600 dark:text-slate-300" numberOfLines={1}>
                    {pickupLocation}
                  </Text>
                </View>
                <Text className="text-xs font-bold text-[#237227] dark:text-emerald-400">
                  ₱{price.toFixed(2)} / {unit}
                </Text>
              </View>
            </View>

            {/* Quantity Selector */}
            <View className="space-y-2 mt-4">
              <Text className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Reservation Quantity ({unit})
              </Text>
              
              <View className="flex-row items-center gap-3">
                <TouchableOpacity
                  onPress={() => handleAdjustQuantity(-5)}
                  className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 items-center justify-center border border-slate-200 dark:border-slate-700"
                >
                  <Ionicons name="remove" size={20} color="#334155" />
                </TouchableOpacity>

                <View className="flex-1 flex-row items-center justify-center h-11 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#18191a] px-3">
                  <TextInput
                    keyboardType="numeric"
                    value={customInput}
                    onChangeText={handleInputChange}
                    className="text-center text-lg font-bold text-slate-900 dark:text-white flex-1"
                  />
                  <Text className="text-xs font-semibold text-slate-400 ml-1">{unit}</Text>
                </View>

                <TouchableOpacity
                  onPress={() => handleAdjustQuantity(5)}
                  className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 items-center justify-center border border-emerald-200 dark:border-emerald-800"
                >
                  <Ionicons name="add" size={20} color="#237227" />
                </TouchableOpacity>
              </View>

              {/* Quick Preset Buttons */}
              <View className="flex-row items-center gap-2 mt-2">
                {[5, 10, 25, 50].map((preset) => (
                  <TouchableOpacity
                    key={preset}
                    onPress={() => {
                      setQuantity(preset);
                      setCustomInput(String(preset));
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold ${
                      quantity === preset
                        ? 'bg-[#237227] border-[#237227]'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        quantity === preset ? 'text-white' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {preset} {unit}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Buyer Notes */}
            <View className="space-y-1.5 mt-4">
              <Text className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Special Requests / Notes (Optional)
              </Text>
              <TextInput
                placeholder="e.g. Will bring own crates, preferred morning pickup..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                value={buyerNotes}
                onChangeText={setBuyerNotes}
                className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#18191a] text-xs text-slate-900 dark:text-white"
              />
            </View>

            {/* Price Breakdown Banner */}
            <View className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-[#18191a] border border-slate-200/80 dark:border-slate-800 flex-row items-center justify-between">
              <View>
                <Text className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                  Estimated Total Amount
                </Text>
                <Text className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Final price confirmed upon physical weigh-in
                </Text>
              </View>
              <Text className="text-xl font-extrabold text-[#237227] dark:text-emerald-400">
                ₱{totalAmount}
              </Text>
            </View>

            {/* Action Buttons */}
            <View className="pt-2 pb-6 space-y-2.5">
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-[#237227] items-center justify-center shadow-md active:bg-[#1c5c1f]"
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="checkmark-done" size={18} color="#ffffff" />
                    <Text className="text-white text-sm font-bold">
                      Confirm Advance Reservation
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onClose}
                className="w-full py-2.5 items-center justify-center"
              >
                <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
