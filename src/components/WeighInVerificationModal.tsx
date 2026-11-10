import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { verifyPickupApi, HarvestReservation } from '@/services/reservation-service';
import { useToast } from '@/context/toast-context';

interface WeighInVerificationModalProps {
  visible: boolean;
  onClose: () => void;
  reservation: HarvestReservation | null;
  onSuccess: (receipt: HarvestReservation) => void;
}

export default function WeighInVerificationModal({
  visible,
  onClose,
  reservation,
  onSuccess,
}: WeighInVerificationModalProps) {
  const { showToast } = useToast();
  const [weighedQty, setWeighedQty] = useState<string>('');
  const [sellerNotes, setSellerNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (reservation) {
      setWeighedQty(String(reservation.quantity));
      setSellerNotes('');
    }
  }, [reservation]);

  if (!reservation) return null;

  const unitPrice = Number(reservation.price_per_unit) || 0;
  const parsedWeighed = parseFloat(weighedQty) || 0;
  const finalAmount = (parsedWeighed * unitPrice).toFixed(2);

  const handleVerify = async () => {
    if (parsedWeighed <= 0) {
      showToast('Please enter a valid scale weight.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await verifyPickupApi({
        reservationCode: reservation.reservation_code,
        qrToken: reservation.qr_token,
        actualWeighedQuantity: parsedWeighed,
        sellerNotes: sellerNotes.trim(),
      });

      if (res.success) {
        showToast(
          `Weigh-In Verified! Order completed: ${parsedWeighed} ${reservation.unit} at ₱${finalAmount}`,
          'success'
        );
        onSuccess(res.receipt);
        onClose();
      } else {
        showToast(res.message || 'Could not verify weigh-in.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Server error occurred.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-black/60 justify-end"
      >
        <View className="bg-white dark:bg-[#1e2022] rounded-t-3xl p-6 shadow-2xl border-t border-slate-200/80 dark:border-slate-800">
          
          {/* Header */}
          <View className="flex-row items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <View className="flex-row items-center gap-2.5">
              <View className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 items-center justify-center">
                <Ionicons name="scale-outline" size={20} color="#237227" />
              </View>
              <View>
                <Text className="text-base font-bold text-slate-900 dark:text-white">
                  Weigh-In & Pickup Verification
                </Text>
                <Text className="text-xs text-slate-500">
                  {reservation.reservation_code} • {reservation.crop_name}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} className="p-1">
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Form Content */}
          <View className="py-4 space-y-4">
            
            {/* Reserved vs Actual */}
            <View className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#18191a] border border-slate-200 dark:border-slate-800 flex-row justify-between items-center">
              <View>
                <Text className="text-[10px] text-slate-400 uppercase font-bold">Initial Reserved</Text>
                <Text className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {reservation.quantity} {reservation.unit}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-[10px] text-slate-400 uppercase font-bold">Agreed Unit Rate</Text>
                <Text className="text-sm font-bold text-[#237227] dark:text-emerald-400">
                  ₱{unitPrice.toFixed(2)} / {reservation.unit}
                </Text>
              </View>
            </View>

            {/* Scale Input */}
            <View className="space-y-1.5">
              <Text className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Actual Physical Scale Weight ({reservation.unit}) <Text className="text-rose-500">*</Text>
              </Text>
              <View className="flex-row items-center h-12 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#18191a] px-4">
                <Ionicons name="speedometer-outline" size={18} color="#237227" />
                <TextInput
                  keyboardType="decimal-pad"
                  value={weighedQty}
                  onChangeText={setWeighedQty}
                  placeholder="0.00"
                  className="flex-1 ml-2.5 text-base font-bold text-slate-900 dark:text-white"
                />
                <Text className="text-xs font-semibold text-slate-400">{reservation.unit}</Text>
              </View>
            </View>

            {/* Weigh-in Notes */}
            <View className="space-y-1.5">
              <Text className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Inspection / Scale Notes
              </Text>
              <TextInput
                placeholder="e.g. Weighed at Bogo Central Hub, certified scale #2"
                placeholderTextColor="#94a3b8"
                value={sellerNotes}
                onChangeText={setSellerNotes}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#18191a] text-xs text-slate-900 dark:text-white"
              />
            </View>

            {/* Settlement Calculation */}
            <View className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 flex-row items-center justify-between">
              <View>
                <Text className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                  Final Settled Amount
                </Text>
                <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {parsedWeighed} {reservation.unit} × ₱{unitPrice.toFixed(2)}
                </Text>
              </View>
              <Text className="text-2xl font-black text-[#237227] dark:text-emerald-400">
                ₱{finalAmount}
              </Text>
            </View>

            {/* Action Buttons */}
            <View className="pt-2 flex-row gap-3">
              <TouchableOpacity
                onPress={onClose}
                className="flex-1 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 items-center justify-center"
              >
                <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleVerify}
                disabled={isSubmitting}
                className="flex-2 py-3.5 rounded-xl bg-[#237227] items-center justify-center shadow-md flex-row gap-2 active:bg-[#1c5c1f]"
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done-circle" size={18} color="#ffffff" />
                    <Text className="text-white text-xs font-bold">
                      Stamp & Complete Order
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
