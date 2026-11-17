import { useAppTheme } from "@/context/theme-context";
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
  StyleSheet,
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
  const { themeColor } = useAppTheme();
  const styles = createStyles(themeColor);
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
  const pickupLocation = post.pickupHub || post.location || 'Northern Valley Central Market Hub';

  // Calculate days left
  let daysLeftText = 'Harvest Soon';
  try {
    if (post.expectedHarvestDate) {
      const target = new Date(post.expectedHarvestDate);
      const diffDays = Math.ceil((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        daysLeftText = `${diffDays} days to harvest`;
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
        const fallbackReservation: HarvestReservation = res.reservation || {
          id: Date.now(),
          reservation_code: `LF-RES-${Math.floor(1000 + Math.random() * 9000)}`,
          post_id: Number(post.id),
          seller_id: 0,
          buyer_id: 0,
          crop_name: cropName,
          quantity,
          unit,
          price_per_unit: price,
          total_estimated_amount: Number(totalAmount),
          harvest_date: post.expectedHarvestDate || new Date().toISOString(),
          pickup_location: pickupLocation,
          status: 'pending',
          qr_token: `QR_${Date.now()}`,
          buyer_notes: buyerNotes.trim() || null,
          created_at: new Date().toISOString(),
        };
        onSuccess(fallbackReservation);
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
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.sheetContainer}>
          {/* Subtle Top Pull Handle */}
          <View style={styles.handleBar} />

          {/* Clean Editorial Header */}
          <View style={styles.header}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <View style={styles.eyebrowRow}>
                <Ionicons name="leaf" size={11} color={themeColor("#3d6349", "#E6E6E6")} />
                <Text style={styles.eyebrowText}>PRE-HARVEST ALLOCATION</Text>
              </View>
              <Text style={styles.titleText}>Reserve Harvest Batch</Text>
              <Text style={styles.subtitleText} numberOfLines={1}>
                Direct from verified grower • {post.location || pickupLocation}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={17} color={themeColor("#516859", "#E6E6E6")} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* 1. Batch Info Hero Card - Quiet Luxury */}
            <View style={styles.batchCard}>
              <View style={styles.batchTopRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.cropNameText}>{cropName}</Text>
                  <View style={styles.growerRow}>
                    <Text style={styles.growerName}>{post.authorName || 'Local Producer'}</Text>
                    {post.isVerified && (
                      <Ionicons name="checkmark-circle" size={13} color={themeColor("#2b5037", "#E6E6E6")} />
                    )}
                    <Text style={styles.metaDot}>•</Text>
                    <Text style={styles.hubInlineText} numberOfLines={1}>
                      {pickupLocation}
                    </Text>
                  </View>
                </View>

                {/* Refined Harvest Countdown Tag */}
                <View style={styles.daysPill}>
                  <View style={styles.daysDot} />
                  <Text style={styles.daysPillText}>{daysLeftText}</Text>
                </View>
              </View>

              <View style={styles.batchBottomRow}>
                <Text style={styles.batchRateLabel}>Unit Price</Text>
                <Text style={styles.unitPriceText}>
                  ₱{price.toFixed(2)}{' '}
                  <Text style={styles.unitSub}>/ {unit}</Text>
                </Text>
              </View>
            </View>

            {/* 2. Unified Tactile Quantity Console */}
            <View style={styles.consoleCard}>
              <View style={styles.consoleHeader}>
                <Text style={styles.sectionLabel}>RESERVATION QUANTITY</Text>
                <Text style={styles.sectionSubtext}>Adjust amount</Text>
              </View>

              {/* Sculpted Stepper */}
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  onPress={() => handleAdjustQuantity(-5)}
                  style={styles.stepperMinusBtn}
                  activeOpacity={0.65}
                  accessibilityLabel="Decrease quantity"
                >
                  <Ionicons name="remove" size={18} color={themeColor("#2b4735", "#E6E6E6")} />
                </TouchableOpacity>

                <View style={styles.stepperHeroDisplay}>
                  <TextInput
                    keyboardType="numeric"
                    value={customInput}
                    onChangeText={handleInputChange}
                    style={styles.stepperHeroInput}
                    selectTextOnFocus
                    underlineColorAndroid="transparent"
                  />
                  <Text style={styles.stepperHeroUnit}>{unit}</Text>
                </View>

                <TouchableOpacity
                  onPress={() => handleAdjustQuantity(5)}
                  style={styles.stepperPlusBtn}
                  activeOpacity={0.8}
                  accessibilityLabel="Increase quantity"
                >
                  <Ionicons name="add" size={18} color={themeColor("#ffffff", "#181818")} />
                </TouchableOpacity>
              </View>

              {/* Integrated Seamless Preset Chips */}
              <View style={styles.presetsRow}>
                {[5, 10, 25, 50].map((preset) => {
                  const isSelected = quantity === preset;
                  return (
                    <TouchableOpacity
                      key={preset}
                      onPress={() => {
                        setQuantity(preset);
                        setCustomInput(String(preset));
                      }}
                      style={[
                        styles.presetChip,
                        isSelected ? styles.presetChipActive : styles.presetChipInactive,
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.presetChipText,
                          isSelected ? styles.presetChipTextActive : styles.presetChipTextInactive,
                        ]}
                      >
                        {preset} {unit}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 3. Special Requests / Notes */}
            <View style={styles.notesSection}>
              <Text style={styles.sectionLabel}>NOTE TO GROWER (OPTIONAL)</Text>
              <TextInput
                placeholder="e.g. Preferred morning pickup, will bring own crates..."
                placeholderTextColor={themeColor("#95a69a", "#E6E6E6")}
                multiline
                numberOfLines={3}
                value={buyerNotes}
                onChangeText={setBuyerNotes}
                style={styles.notesInput}
                underlineColorAndroid="transparent"
              />
            </View>

            {/* 4. Elegant Receipt Summary Line */}
            <View style={styles.receiptLine}>
              <View style={{ flex: 1, paddingRight: 14 }}>
                <Text style={styles.receiptLabel}>ESTIMATED TOTAL</Text>
                <Text style={styles.receiptSubtext}>
                  ₱{price.toFixed(2)} × {quantity} {unit} • Verified upon scale weigh-in
                </Text>
              </View>
              <Text style={styles.receiptTotalAmount}>₱{totalAmount}</Text>
            </View>

            {/* 5. Primary Action & Dismiss */}
            <View style={styles.actionWrap}>
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={isSubmitting}
                style={[styles.confirmBtn, isSubmitting && { opacity: 0.8 }]}
                activeOpacity={0.88}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={themeColor("#ffffff", "#181818")} />
                ) : (
                  <View style={styles.btnInnerRow}>
                    <Ionicons name="checkmark-sharp" size={17} color={themeColor("#ffffff", "#181818")} />
                    <Text style={styles.confirmBtnText}>
                      Confirm {quantity} {unit} • ₱{totalAmount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onClose}
                style={styles.cancelBtn}
                activeOpacity={0.6}
              >
                <Text style={styles.cancelBtnText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (themeColor: (light: string, dark: string) => string) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(18, 27, 21, 0.55)',
  },
  backdrop: {
    ...(StyleSheet.absoluteFill as any),
  },
  sheetContainer: {
    backgroundColor: themeColor("#faf9f6", "#181818"),
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderTopWidth: 1,
    borderColor: themeColor("#e7ece3", "#414141"),
    maxHeight: '90%',
    shadowColor: '#122017',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 16,
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: themeColor("#d8ded6", "#303030"),
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: themeColor("#edf1ea", "#414141"),
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 3,
  },
  eyebrowText: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 1.6,
    color: themeColor("#3d6349", "#E6E6E6"),
  },
  titleText: {
    fontSize: 20,
    fontWeight: '700',
    color: themeColor("#1a271f", "#E6E6E6"),
    letterSpacing: -0.4,
  },
  subtitleText: {
    fontSize: 11.5,
    color: themeColor("#6e8073", "#E6E6E6"),
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: themeColor("#eef2eb", "#181818"),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 28,
  },
  batchCard: {
    backgroundColor: themeColor("#f4f7f1", "#181818"),
    borderRadius: 18,
    borderWidth: 1,
    borderColor: themeColor("#dfe7dc", "#414141"),
    padding: 14,
    marginBottom: 16,
  },
  batchTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cropNameText: {
    fontSize: 17,
    fontWeight: '700',
    color: themeColor("#1a271f", "#E6E6E6"),
    letterSpacing: -0.3,
  },
  growerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
    flexWrap: 'wrap',
  },
  growerName: {
    fontSize: 11.5,
    fontWeight: '600',
    color: themeColor("#284131", "#E6E6E6"),
  },
  metaDot: {
    fontSize: 10,
    color: themeColor("#9db0a3", "#E6E6E6"),
  },
  hubInlineText: {
    fontSize: 11.5,
    color: themeColor("#5f7567", "#E6E6E6"),
    maxWidth: 170,
  },
  daysPill: {
    backgroundColor: themeColor("#274332", "#E6E6E6"),
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4.5,
  },
  daysDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: themeColor("#98e3b2", "#E6E6E6"),
  },
  daysPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: themeColor("#ffffff", "#E6E6E6"),
    letterSpacing: 0.2,
  },
  batchBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: themeColor("#e4ecdf", "#414141"),
  },
  batchRateLabel: {
    fontSize: 11,
    color: themeColor("#6f8375", "#E6E6E6"),
    fontWeight: '500',
  },
  unitPriceText: {
    fontSize: 15,
    fontWeight: '700',
    color: themeColor("#223c2d", "#E6E6E6"),
  },
  unitSub: {
    fontSize: 11,
    fontWeight: '500',
    color: themeColor("#657e6f", "#E6E6E6"),
  },
  consoleCard: {
    backgroundColor: themeColor("#ffffff", "#242424"),
    borderRadius: 20,
    borderWidth: 1,
    borderColor: themeColor("#e2ebe0", "#414141"),
    padding: 16,
    marginBottom: 16,
    shadowColor: '#122017',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  consoleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: themeColor("#5b7062", "#E6E6E6"),
    marginBottom: 6,
  },
  sectionSubtext: {
    fontSize: 10.5,
    color: themeColor("#8a9b8f", "#E6E6E6"),
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 14,
  },
  stepperMinusBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: themeColor("#f1f5ee", "#181818"),
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperHeroDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  stepperHeroInput: {
    fontSize: 34,
    fontWeight: '800',
    color: themeColor("#192b20", "#E6E6E6"),
    textAlign: 'center',
    minWidth: 54,
    paddingVertical: 0,
    paddingHorizontal: 2,
    borderWidth: 0,
    backgroundColor: 'transparent',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
        boxShadow: 'none',
      } as any,
    }),
  },
  stepperHeroUnit: {
    fontSize: 13.5,
    fontWeight: '600',
    color: themeColor("#6f8375", "#E6E6E6"),
    marginLeft: 3,
  },
  stepperPlusBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: themeColor("#274332", "#E6E6E6"),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#274332',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  presetsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  presetChipActive: {
    backgroundColor: themeColor("#274332", "#E6E6E6"),
    borderColor: themeColor("#274332", "#414141"),
  },
  presetChipInactive: {
    backgroundColor: themeColor("#f6f9f4", "#181818"),
    borderColor: themeColor("#e2ebe0", "#414141"),
  },
  presetChipText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  presetChipTextActive: {
    color: themeColor("#ffffff", "#E6E6E6"),
    fontWeight: '700',
  },
  presetChipTextInactive: {
    color: themeColor("#3b5143", "#E6E6E6"),
  },
  notesSection: {
    marginBottom: 16,
  },
  notesInput: {
    backgroundColor: themeColor("#ffffff", "#242424"),
    borderRadius: 14,
    borderWidth: 1,
    borderColor: themeColor("#e1ebe0", "#414141"),
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 12.5,
    color: themeColor("#1a271f", "#E6E6E6"),
    textAlignVertical: 'top',
    minHeight: 68,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
        boxShadow: 'none',
      } as any,
    }),
  },
  receiptLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: themeColor("#e6ede3", "#414141"),
    borderBottomWidth: 1,
    borderBottomColor: themeColor("#e6ede3", "#414141"),
    marginBottom: 18,
  },
  receiptLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: themeColor("#46644f", "#E6E6E6"),
  },
  receiptSubtext: {
    fontSize: 11,
    color: themeColor("#657d6e", "#E6E6E6"),
    marginTop: 2,
    lineHeight: 15,
  },
  receiptTotalAmount: {
    fontSize: 26,
    fontWeight: '800',
    color: themeColor("#1d3626", "#E6E6E6"),
    letterSpacing: -0.6,
  },
  actionWrap: {
    gap: 8,
  },
  confirmBtn: {
    backgroundColor: themeColor("#274332", "#E6E6E6"),
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#274332',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 4,
  },
  btnInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confirmBtnText: {
    color: themeColor("#ffffff", "#E6E6E6"),
    fontSize: 14.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  cancelBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: themeColor("#7a8e81", "#E6E6E6"),
  },
});
