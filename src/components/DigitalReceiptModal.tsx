import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect, Path } from 'react-native-svg';
import * as Clipboard from 'expo-clipboard';
import { useToast } from '@/context/toast-context';
import { HarvestReservation } from '@/services/reservation-service';

interface DigitalReceiptModalProps {
  visible: boolean;
  onClose: () => void;
  reservation: HarvestReservation | null;
  onOpenWeighIn?: (reservation: HarvestReservation) => void;
  isSeller?: boolean;
}

// Procedural SVG QR Code Renderer for robust offline visual representation
function RenderSvgQrCode({ code, size = 160 }: { code: string; size?: number }) {
  // Generate a deterministic 21x21 QR-like matrix pattern from the code string
  const gridSize = 21;
  const cellSize = size / gridSize;

  // Hash the string into bit patterns
  const seed = code.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const matrix: boolean[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(false));

  // Finder patterns at top-left, top-right, bottom-left
  const addFinderPattern = (startRow: number, startCol: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (
          r === 0 || r === 6 || c === 0 || c === 6 ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          matrix[startRow + r][startCol + c] = true;
        }
      }
    }
  };

  addFinderPattern(0, 0);
  addFinderPattern(0, gridSize - 7);
  addFinderPattern(gridSize - 7, 0);

  // Fill pseudo-data cells
  let bitIndex = seed;
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      // Don't overwrite finder patterns
      const inTopLeft = r < 8 && c < 8;
      const inTopRight = r < 8 && c >= gridSize - 8;
      const inBottomLeft = r >= gridSize - 8 && c < 8;

      if (!inTopLeft && !inTopRight && !inBottomLeft) {
        bitIndex = (bitIndex * 9301 + 49297) % 233280;
        matrix[r][c] = (bitIndex % 3) === 0;
      }
    }
  }

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Rect x={0} y={0} width={size} height={size} fill="#ffffff" />
      {matrix.map((row, r) =>
        row.map((cell, c) =>
          cell ? (
            <Rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize + 0.2}
              height={cellSize + 0.2}
              fill="#1b4332"
            />
          ) : null
        )
      )}
    </Svg>
  );
}

export default function DigitalReceiptModal({
  visible,
  onClose,
  reservation,
  onOpenWeighIn,
  isSeller = false,
}: DigitalReceiptModalProps) {
  const { showToast } = useToast();

  if (!reservation) return null;

  const isCompleted = reservation.status === 'completed';
  const isReady = reservation.status === 'ready_for_pickup';
  const isConfirmed = reservation.status === 'confirmed';

  const handleCopyCode = async () => {
    try {
      await Clipboard.setStringAsync(reservation.reservation_code);
      showToast(`Code copied: ${reservation.reservation_code}`, 'success');
    } catch {
      showToast('Unable to copy code.', 'error');
    }
  };

  const handleShareReceipt = async () => {
    try {
      await Share.share({
        message: `🌾 Local Farm Digital Pickup Receipt\nReservation Code: ${reservation.reservation_code}\nCrop: ${reservation.crop_name} (${reservation.quantity} ${reservation.unit})\nEstimated: ₱${Number(reservation.total_estimated_amount).toFixed(2)}\nPickup: ${reservation.pickup_location}\nStatus: ${reservation.status.toUpperCase()}`,
      });
    } catch {}
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/70 items-center justify-center p-4">
        <View className="bg-white dark:bg-[#1e2022] rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-200/80 dark:border-slate-800">
          
          {/* Header Bar */}
          <View className="p-4 bg-[#237227] flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View className="w-7 h-7 rounded-lg bg-white/20 items-center justify-center">
                <Ionicons name="receipt-outline" size={16} color="#ffffff" />
              </View>
              <Text className="text-white font-bold text-sm">
                Digital Pickup Receipt
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-1">
              <Ionicons name="close" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <ScrollView className="p-5 max-h-[500px]" showsVerticalScrollIndicator={false}>
            {/* Status Pill */}
            <View className="items-center my-2">
              <View
                className={`px-3 py-1 rounded-full flex-row items-center gap-1.5 ${
                  isCompleted
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800'
                    : isReady
                    ? 'bg-purple-100 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-800'
                    : isConfirmed
                    ? 'bg-blue-100 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-800'
                    : 'bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800'
                }`}
              >
                <Ionicons
                  name={isCompleted ? 'checkmark-circle' : isReady ? 'cube' : 'time'}
                  size={14}
                  color={isCompleted ? '#237227' : isReady ? '#7e22ce' : isConfirmed ? '#1d4ed8' : '#b45309'}
                />
                <Text
                  className={`text-xs font-bold uppercase tracking-wider ${
                    isCompleted
                      ? 'text-[#237227] dark:text-emerald-400'
                      : isReady
                      ? 'text-purple-700 dark:text-purple-300'
                      : isConfirmed
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-amber-700 dark:text-amber-400'
                  }`}
                >
                  {reservation.status.replace(/_/g, ' ')}
                </Text>
              </View>

              <Text className="text-xl font-extrabold text-slate-900 dark:text-white mt-2">
                {reservation.reservation_code}
              </Text>
              <Text className="text-[11px] text-slate-400 mt-0.5">
                Issued on {new Date(reservation.created_at).toLocaleDateString()}
              </Text>
            </View>

            {/* QR Code Container */}
            <View className="items-center justify-center p-4 bg-slate-50 dark:bg-[#141517] rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 my-3">
              <RenderSvgQrCode code={reservation.qr_token || reservation.reservation_code} size={150} />
              <Text className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-2">
                Scan or present this code at pickup hub
              </Text>
            </View>

            {/* Receipt Details Breakdown */}
            <View className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <View className="flex-row justify-between">
                <Text className="text-xs text-slate-500">Crop Variety</Text>
                <Text className="text-xs font-bold text-slate-900 dark:text-white">
                  {reservation.crop_name}
                </Text>
              </View>

              <View className="flex-row justify-between">
                <Text className="text-xs text-slate-500">Reserved Quantity</Text>
                <Text className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {reservation.quantity} {reservation.unit} @ ₱{Number(reservation.price_per_unit).toFixed(2)}
                </Text>
              </View>

              {reservation.actual_weighed_quantity && (
                <View className="flex-row justify-between p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40">
                  <Text className="text-xs font-bold text-[#237227] dark:text-emerald-400">
                    Actual Weighed Quantity
                  </Text>
                  <Text className="text-xs font-extrabold text-[#237227] dark:text-emerald-400">
                    {reservation.actual_weighed_quantity} {reservation.unit}
                  </Text>
                </View>
              )}

              <View className="flex-row justify-between">
                <Text className="text-xs text-slate-500">Pickup Location</Text>
                <Text className="text-xs font-medium text-slate-700 dark:text-slate-300 text-right max-w-[180px]">
                  {reservation.pickup_location}
                </Text>
              </View>

              <View className="flex-row justify-between">
                <Text className="text-xs text-slate-500">Farmer / Producer</Text>
                <Text className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {reservation.seller_name || 'Verified Farmer'}
                </Text>
              </View>

              <View className="flex-row justify-between">
                <Text className="text-xs text-slate-500">Buyer Name</Text>
                <Text className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {reservation.buyer_name || 'Registered Buyer'}
                </Text>
              </View>

              {/* Total Settlement */}
              <View className="pt-2 border-t border-slate-200 dark:border-slate-800 flex-row justify-between items-center">
                <Text className="text-xs font-bold text-slate-900 dark:text-white">
                  {isCompleted ? 'Final Settled Price' : 'Estimated Total'}
                </Text>
                <Text className="text-lg font-extrabold text-[#237227] dark:text-emerald-400">
                  ₱
                  {Number(
                    isCompleted && reservation.final_settled_amount
                      ? reservation.final_settled_amount
                      : reservation.total_estimated_amount
                  ).toFixed(2)}
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-2 mt-5 mb-2">
              <TouchableOpacity
                onPress={handleCopyCode}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 items-center justify-center flex-row gap-1.5"
              >
                <Ionicons name="copy-outline" size={14} color="#64748b" />
                <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Copy Code
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleShareReceipt}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 items-center justify-center flex-row gap-1.5"
              >
                <Ionicons name="share-social-outline" size={14} color="#64748b" />
                <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Share
                </Text>
              </TouchableOpacity>
            </View>

            {/* Seller Weigh-in Shortcut */}
            {isSeller && !isCompleted && onOpenWeighIn && (
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  onOpenWeighIn(reservation);
                }}
                className="w-full mt-2 py-3 rounded-xl bg-[#237227] items-center justify-center shadow-xs flex-row gap-2"
              >
                <Ionicons name="scale-outline" size={16} color="#ffffff" />
                <Text className="text-white text-xs font-bold">
                  Weigh-In & Complete Order
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>

        </View>
      </View>
    </Modal>
  );
}
