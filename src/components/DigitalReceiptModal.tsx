import { useAppTheme } from "@/context/theme-context";
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
              fill="#274332"
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
  const { themeColor } = useAppTheme();
  const { showToast } = useToast();

  if (!reservation) return null;

  const statusStr = String(reservation.status || 'pending');
  const isCompleted = statusStr === 'completed';
  const isReady = statusStr === 'ready_for_pickup';
  const isConfirmed = statusStr === 'confirmed';

  const reservationCode = reservation.reservation_code || `LF-RES-${reservation.id || 'PENDING'}`;
  const qrCodeValue = reservation.qr_token || reservationCode;
  const cropName = reservation.crop_name || 'Produce';
  const quantity = Number(reservation.quantity) || 1;
  const unit = reservation.unit || 'kg';
  const pricePerUnit = Number(reservation.price_per_unit) || 0;
  const pickupLocation = reservation.pickup_location || 'Designated Farm Gate Hub';
  const totalAmount = Number(
    isCompleted && reservation.final_settled_amount
      ? reservation.final_settled_amount
      : reservation.total_estimated_amount || quantity * pricePerUnit
  ).toFixed(2);

  const handleCopyCode = async () => {
    try {
      await Clipboard.setStringAsync(reservationCode);
      showToast(`Code copied: ${reservationCode}`, 'success');
    } catch {
      showToast('Unable to copy code.', 'error');
    }
  };

  const handleShareReceipt = async () => {
    try {
      await Share.share({
        message: `🌾 Local Farm Digital Pickup Receipt\nReservation Code: ${reservationCode}\nCrop: ${cropName} (${quantity} ${unit})\nEstimated: ₱${totalAmount}\nPickup: ${pickupLocation}\nStatus: ${statusStr.toUpperCase()}`,
      });
    } catch {}
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(18, 27, 21, 0.55)', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <View style={{ backgroundColor: themeColor("#faf9f6", "#181818"), borderRadius: 28, width: '100%', maxWidth: 360, overflow: 'hidden', borderWidth: 1, borderColor: themeColor("#e6ece2", "#414141"), shadowColor: '#122017', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.16, shadowRadius: 18, elevation: 12 }}>
          
          {/* Header Bar */}
          <View style={{ paddingHorizontal: 18, paddingVertical: 14, backgroundColor: themeColor("#274332", "#E6E6E6"), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(255, 255, 255, 0.15)', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="receipt-outline" size={15} color={themeColor("#ffffff", "#E6E6E6")} />
              </View>
              <Text style={{ color: themeColor("#ffffff", "#E6E6E6"), fontWeight: '700', fontSize: 13.5, letterSpacing: 0.2 }}>
                Digital Pickup Receipt
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={19} color={themeColor("#ffffff", "#E6E6E6")} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 18, maxHeight: 480 }} showsVerticalScrollIndicator={false}>
            {/* Status Pill */}
            <View style={{ alignItems: 'center', marginVertical: 4 }}>
              <View
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderRadius: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: isCompleted ? '#edf4e9' : isReady ? '#ede9fe' : isConfirmed ? '#e0f2fe' : '#fef3c7',
                  borderWidth: 1,
                  borderColor: isCompleted ? '#c9ddc3' : isReady ? '#ddd6fe' : isConfirmed ? '#bae6fd' : '#fde68a',
                }}
              >
                <Ionicons
                  name={isCompleted ? 'checkmark-circle' : isReady ? 'cube' : 'time'}
                  size={13}
                  color={isCompleted ? '#274332' : isReady ? '#6d28d9' : isConfirmed ? '#0284c7' : '#b45309'}
                />
                <Text
                  style={{
                    fontSize: 10.5,
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                    color: isCompleted ? '#274332' : isReady ? '#6d28d9' : isConfirmed ? '#0284c7' : '#b45309',
                  }}
                >
                  {statusStr.replace(/_/g, ' ')}
                </Text>
              </View>

              <Text style={{ fontSize: 20, fontWeight: '800', color: themeColor("#1a271f", "#E6E6E6"), marginTop: 8, letterSpacing: 0.5 }}>
                {reservationCode}
              </Text>
              <Text style={{ fontSize: 11, color: themeColor("#7a8e81", "#E6E6E6"), marginTop: 2 }}>
                Issued on {reservation.created_at ? new Date(reservation.created_at).toLocaleDateString() : 'Today'}
              </Text>
            </View>

            {/* QR Code Container */}
            <View style={{ alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: themeColor("#ffffff", "#242424"), borderRadius: 18, borderWidth: 1, borderColor: themeColor("#e4ece0", "#414141"), marginVertical: 12 }}>
              <RenderSvgQrCode code={qrCodeValue} size={144} />
              <Text style={{ fontSize: 10, color: themeColor("#7a8e81", "#E6E6E6"), fontWeight: '500', marginTop: 10 }}>
                Scan or present this code at pickup hub
              </Text>
            </View>

            {/* Receipt Details Breakdown */}
            <View style={{ paddingTop: 10, borderTopWidth: 1, borderTopColor: themeColor("#edf1ea", "#414141"), gap: 9 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 11.5, color: themeColor("#687e70", "#E6E6E6") }}>Crop Variety</Text>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: themeColor("#1a271f", "#E6E6E6") }}>
                  {cropName}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 11.5, color: themeColor("#687e70", "#E6E6E6") }}>Reserved Quantity</Text>
                <Text style={{ fontSize: 11.5, fontWeight: '600', color: themeColor("#274332", "#E6E6E6") }}>
                  {quantity} {unit} @ ₱{pricePerUnit.toFixed(2)}
                </Text>
              </View>

              {reservation.actual_weighed_quantity && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 8, borderRadius: 10, backgroundColor: themeColor("#edf4e9", "#181818"), borderWidth: 1, borderColor: themeColor("#d7e4d2", "#414141") }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: themeColor("#274332", "#E6E6E6") }}>
                    Actual Scale Weight
                  </Text>
                  <Text style={{ fontSize: 11.5, fontWeight: '800', color: themeColor("#274332", "#E6E6E6") }}>
                    {reservation.actual_weighed_quantity} {unit}
                  </Text>
                </View>
              )}

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 11.5, color: themeColor("#687e70", "#E6E6E6") }}>Pickup Hub</Text>
                <Text style={{ fontSize: 11.5, fontWeight: '500', color: themeColor("#1a271f", "#E6E6E6"), textAlign: 'right', maxWidth: 180 }}>
                  {pickupLocation}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 11.5, color: themeColor("#687e70", "#E6E6E6") }}>Farmer</Text>
                <Text style={{ fontSize: 11.5, fontWeight: '500', color: themeColor("#1a271f", "#E6E6E6") }}>
                  {reservation.seller_name || 'Verified Farmer'}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 11.5, color: themeColor("#687e70", "#E6E6E6") }}>Buyer</Text>
                <Text style={{ fontSize: 11.5, fontWeight: '500', color: themeColor("#1a271f", "#E6E6E6") }}>
                  {reservation.buyer_name || 'Registered Buyer'}
                </Text>
              </View>

              {/* Total Settlement */}
              <View style={{ paddingTop: 10, marginTop: 4, borderTopWidth: 1, borderTopColor: themeColor("#e3ece0", "#414141"), flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: themeColor("#1a271f", "#E6E6E6") }}>
                  {isCompleted ? 'Final Settled Price' : 'Estimated Total'}
                </Text>
                <Text style={{ fontSize: 19, fontWeight: '800', color: themeColor("#274332", "#E6E6E6") }}>
                  ₱{totalAmount}
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 18, marginBottom: 8 }}>
              <TouchableOpacity
                onPress={handleCopyCode}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: themeColor("#dce5da", "#414141"), backgroundColor: themeColor("#ffffff", "#242424"), alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
                activeOpacity={0.7}
              >
                <Ionicons name="copy-outline" size={14} color={themeColor("#45584b", "#E6E6E6")} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: themeColor("#324538", "#E6E6E6") }}>
                  Copy Code
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleShareReceipt}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: themeColor("#dce5da", "#414141"), backgroundColor: themeColor("#ffffff", "#242424"), alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
                activeOpacity={0.7}
              >
                <Ionicons name="share-social-outline" size={14} color={themeColor("#45584b", "#E6E6E6")} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: themeColor("#324538", "#E6E6E6") }}>
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
                style={{ width: '100%', marginTop: 6, paddingVertical: 12, borderRadius: 14, backgroundColor: themeColor("#274332", "#E6E6E6"), alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, shadowColor: '#274332', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 4, elevation: 3 }}
                activeOpacity={0.85}
              >
                <Ionicons name="scale-outline" size={16} color={themeColor("#ffffff", "#E6E6E6")} />
                <Text style={{ color: themeColor("#ffffff", "#E6E6E6"), fontSize: 12.5, fontWeight: '700' }}>
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
