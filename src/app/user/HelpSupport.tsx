import { useAppTheme } from "@/context/theme-context";
import { useToast } from "@/context/toast-context";
import {
  createSupportTicketApi,
  getSupportTicketsApi,
  SupportTicket,
} from "@/services/support-service";
import { uploadImageToSupabase } from "@/lib/storage";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Subtle entrance animation matching MenuProfile & Security
function FadeEntrance({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const progress = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(progress, {
        toValue: 1,
        duration: 260,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== "web",
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 260,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== "web",
      }),
    ]).start();
  }, [delay, progress, translateY]);

  return (
    <Animated.View style={{ opacity: progress, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

// Tactile press button with spring feedback
function TactileTouchable({
  children,
  onPress,
  style,
  disabled,
  activeOpacity = 0.85,
  scaleTo = 0.98,
  ...rest
}: any) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    Animated.spring(scale, {
      toValue: scaleTo,
      useNativeDriver: Platform.OS !== "web",
      speed: 35,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: Platform.OS !== "web",
      speed: 35,
      bounciness: 4,
    }).start();
  };

  const flattened = StyleSheet.flatten(style) || {};
  const hasFlex = flattened.flex !== undefined;

  return (
    <Animated.View
      style={[
        hasFlex && { flex: flattened.flex },
        { transform: [{ scale }] },
      ]}
    >
      <TouchableOpacity
        activeOpacity={activeOpacity}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        disabled={disabled}
        style={style}
        {...rest}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

interface FAQItem {
  id: string;
  category: "all" | "rsbsa" | "trading" | "disputes" | "account";
  question: string;
  answer: string;
  actionText?: string;
  actionRoute?: string;
  actionIcon?: keyof typeof Ionicons.glyphMap;
}

const FAQS_DATA: FAQItem[] = [
  {
    id: "f1",
    category: "rsbsa",
    question: "How do I get RSBSA verified and earn the Green Badge?",
    answer:
      "Go to Menu > RSBSA Verification. Submit your DA registration number, farm details, and a clear photo of your government-issued ID or DA Farmer Certification. Municipal agricultural officers verify applications within 24 to 48 hours.",
    actionText: "Open RSBSA Verification",
    actionRoute: "/user/RSBSAVerification",
    actionIcon: "ribbon-outline",
  },
  {
    id: "f2",
    category: "trading",
    question: "How do Pre-Harvest Reservations work?",
    answer:
      "Verified growers can post upcoming harvests with target harvest dates and estimated quantities. Buyers reserve quantities ahead of time with a reservation code, securing crop off-take directly from local producers before harvesting.",
    actionText: "View Grower Guides",
    actionRoute: "/user/GrowerGuides",
    actionIcon: "book-outline",
  },
  {
    id: "f3",
    category: "disputes",
    question: "What should I do if a buyer or seller does not show up?",
    answer:
      "We strongly recommend meeting at designated municipal agricultural pickup hubs or trading posts. If a buyer or seller fails to attend or breaches an agreement, tap 'Report an Issue' to notify our dispute resolution team.",
    actionText: "File a Dispute Report",
    actionIcon: "alert-circle-outline",
  },
  {
    id: "f4",
    category: "trading",
    question: "How are produce prices monitored on the platform?",
    answer:
      "LocalFarm references official Department of Agriculture (DA) daily farmgate and wholesale market monitoring to help farmers price fairly and protect consumers from unfair markups.",
    actionText: "Check Harvest Pricing Guide",
    actionRoute: "/user/GrowerGuides",
    actionIcon: "trending-up-outline",
  },
  {
    id: "f5",
    category: "account",
    question: "How do I secure my account with Two-Factor Authentication (2FA)?",
    answer:
      "Navigate to Menu > Security & Login > Two-Factor Authentication. You can link Google Authenticator or enable 6-digit email verification codes for maximum account protection.",
    actionText: "Security & Login",
    actionRoute: "/user/Security",
    actionIcon: "lock-closed-outline",
  },
  {
    id: "f6",
    category: "account",
    question: "Can I control who sees my farm location and pricing?",
    answer:
      "Yes! Under Menu > Privacy Center, you can toggle precise GPS coordinates versus approximate barangay radius, and choose whether produce prices are visible to all visitors or verified buyers only.",
    actionText: "Privacy Center",
    actionRoute: "/user/PrivacyCenter",
    actionIcon: "shield-checkmark-outline",
  },
  {
    id: "f7",
    category: "disputes",
    question: "How do I report fake crop listings or abusive behavior?",
    answer:
      "You can report any post or user directly from the three-dots (•••) menu on the post or chat screen. Alternatively, file a ticket in this Help Desk with screenshots or details. Our moderators act within 12 hours.",
    actionText: "Submit Report",
    actionIcon: "flag-outline",
  },
];

interface FormalCategoryOption {
  id: string;
  label: string;
  shortDesc: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const FORMAL_REPORT_CATEGORIES: FormalCategoryOption[] = [
  {
    id: "Scam or Payment Fraud",
    label: "Scam or Payment Fraud",
    shortDesc: "Fake deposit slips, payment evasion, or non-payment",
    icon: "cash-outline",
  },
  {
    id: "Fake Produce Listing",
    label: "Fake or Misleading Listing",
    shortDesc: "Inaccurate harvest photos, wrong location, or fake stock",
    icon: "alert-circle-outline",
  },
  {
    id: "Buyer / Seller No-Show",
    label: "Buyer / Seller Dispute or No-Show",
    shortDesc: "Abandoned reservation, ghosting pickup hubs, breach of contract",
    icon: "calendar-outline",
  },
  {
    id: "Harassment or Abusive Behavior",
    label: "Harassment & Abusive Behavior",
    shortDesc: "Threats, disrespectful chat, defamation, or unsolicited spam",
    icon: "shield-half-outline",
  },
  {
    id: "RSBSA Impersonation",
    label: "RSBSA / Identity Fraud",
    shortDesc: "Forged DA certifications or claiming unverified farmer status",
    icon: "ribbon-outline",
  },
  {
    id: "App Glitch or Technical Bug",
    label: "Technical Bug / App Glitch",
    shortDesc: "System errors, broken reservation QR codes, or account bugs",
    icon: "bug-outline",
  },
  {
    id: "Other Agricultural Violation",
    label: "Other Agricultural Violation",
    shortDesc: "Any other farm dispute or community guideline breach",
    icon: "help-circle-outline",
  },
];

export default function HelpSupport() {
  const { themeColor } = useAppTheme();
  const styles = createStyles(themeColor);
  const router = useRouter();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [hoveredFaqCategory, setHoveredFaqCategory] = useState<string | null>(null);
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>("f1");

  // Tickets state
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isTicketsModalOpen, setTicketsModalOpen] = useState(false);
  const [selectedTicketDetail, setSelectedTicketDetail] = useState<SupportTicket | null>(null);

  // Formal Report Modal state
  const [isReportModalOpen, setReportModalOpen] = useState(false);
  const [isCategoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState<string>("Scam or Payment Fraud");
  const [reportSubject, setReportSubject] = useState("");
  const [reportReportedUser, setReportReportedUser] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [evidenceImage, setEvidenceImage] = useState<string | null>(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Policy Modal state
  const [isPolicyModalOpen, setPolicyModalOpen] = useState(false);

  // Selected Category Object
  const selectedCategoryObj = useMemo(() => {
    return (
      FORMAL_REPORT_CATEGORIES.find((c) => c.id === reportCategory) ||
      FORMAL_REPORT_CATEGORIES[0]
    );
  }, [reportCategory]);

  // Load user tickets on mount
  useEffect(() => {
    let mounted = true;
    getSupportTicketsApi()
      .then((data) => {
        if (mounted) setTickets(data);
      })
      .catch((err) => console.log("Failed to load tickets:", err));
    return () => {
      mounted = false;
    };
  }, []);

  // Filtered FAQs
  const filteredFaqs = useMemo(() => {
    return FAQS_DATA.filter((faq) => {
      const matchCat = selectedCategory === "all" || faq.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return matchCat;
      const matchText =
        faq.question.toLowerCase().includes(q) ||
        faq.answer.toLowerCase().includes(q);
      return matchCat && matchText;
    });
  }, [searchQuery, selectedCategory]);

  const toggleFaq = (id: string) => {
    setExpandedFaqId((prev) => (prev === id ? null : id));
  };

  const handleFaqAction = (faq: FAQItem) => {
    if (faq.actionRoute) {
      router.push(faq.actionRoute as any);
    } else if (faq.id === "f3" || faq.id === "f7") {
      setReportCategory(
        faq.id === "f3" ? "Buyer / Seller No-Show" : "Fake Produce Listing"
      );
      setReportModalOpen(true);
    }
  };

  // Image picker handlers
  const handlePickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Photo library access is needed to attach evidence pictures."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const uri = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        setEvidenceImage(uri);
      }
    } catch (err) {
      console.log("Failed to pick gallery image:", err);
    }
  };

  const handleCapturePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Camera access is needed to take evidence photos."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const uri = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        setEvidenceImage(uri);
      }
    } catch (err) {
      console.log("Failed to capture photo:", err);
    }
  };

  // Submit report handler
  const handleSubmitReport = async () => {
    if (!reportSubject.trim()) {
      Alert.alert(
        "Missing Issue Statement",
        "Please state the specific issue you are reporting."
      );
      return;
    }
    if (!reportDescription.trim()) {
      Alert.alert(
        "Missing Description",
        "Please provide a detailed statement of what occurred."
      );
      return;
    }

    try {
      setIsSubmittingReport(true);
      let finalEvidence = evidenceImage;
      if (evidenceImage && !evidenceImage.startsWith("http")) {
        try {
          const { path, publicUrl, error } = await uploadImageToSupabase("evidence", evidenceImage);
          if (!error && (path || publicUrl)) {
            finalEvidence = path || publicUrl;
          }
        } catch (uploadErr) {
          console.warn("Evidence bucket upload warning:", uploadErr);
        }
      }

      const newTicket = await createSupportTicketApi({
        category: reportCategory,
        subject: reportSubject.trim(),
        description: reportDescription.trim(),
        relatedUserOrListing: reportReportedUser.trim() || undefined,
        attachments: finalEvidence ? [finalEvidence] : [],
      });

      setTickets((prev) => [newTicket, ...prev]);
      setReportModalOpen(false);
      setReportCategory("Scam or Payment Fraud");
      setReportSubject("");
      setReportReportedUser("");
      setReportDescription("");
      setEvidenceImage(null);

      showToast("Report submitted successfully! Ticket ID: " + newTicket.id, "success");
    } catch {
      showToast("Could not submit report. Please try again.", "error");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleCallHotline = () => {
    Linking.openURL("tel:0289288741").catch(() => {
      Alert.alert("Hotline", "DA Agricultural Assistance: (02) 8928-8741");
    });
  };

  const handleEmailSupport = () => {
    Linking.openURL("mailto:support@localfarm.ph?subject=LocalFarm%20Inquiry").catch(() => {
      Alert.alert("Support Email", "Contact us at support@localfarm.ph");
    });
  };

  const handleBack = () => {
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.push("/user/MenuProfile" as any);
      }
    } catch {
      router.push("/user/MenuProfile" as any);
    }
  };

  const activeTicketsCount = useMemo(() => {
    return tickets.filter(
      (t) => t.status === "Under Review" || t.status === "Received"
    ).length;
  }, [tickets]);

  return (
    <SafeAreaView style={styles.screen}>
      {/* 1. Header (Uniform with other sub-pages) */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color={themeColor("#34594A", "#E6E6E6")} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Help & Support</Text>

        <TouchableOpacity
          onPress={() => setTicketsModalOpen(true)}
          style={styles.ticketBadgeButton}
          accessibilityRole="button"
          accessibilityLabel="My support tickets"
        >
          <Ionicons name="receipt-outline" size={20} color={themeColor("#34594A", "#E6E6E6")} />
          {activeTicketsCount > 0 && (
            <View style={styles.activeDot} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: themeColor("#FAF9F5", "#181818") }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 2. Rich Hero Banner */}
        <FadeEntrance delay={20}>
          <LinearGradient
            colors={["#29483B", "#38604F"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroBanner}
          >
            <View style={styles.heroHeader}>
              <View style={styles.heroIconBox}>
                <Ionicons name="help-buoy" size={22} color={themeColor("#FFFFFF", "#E6E6E6")} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>LocalFarm Help Desk</Text>
                <Text style={styles.heroSubtitle}>
                  FAQs, dispute reporting & grower resources
                </Text>
              </View>
            </View>
            <Text style={styles.heroDescription}>
              Need assistance with an agricultural transaction, RSBSA registration, or have questions about the platform? Browse official resources or reach our team.
            </Text>

            {/* In-hero Search Bar */}
            <View style={styles.heroSearchContainer}>
              <Ionicons name="search-outline" size={17} color={themeColor("#687C71", "#E6E6E6")} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search FAQs, issues, and guides..."
                placeholderTextColor={themeColor("#85968C", "#E6E6E6")}
                style={styles.heroSearchInput}
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")} style={{ padding: 4 }}>
                  <Ionicons name="close-circle" size={16} color={themeColor("#7F9186", "#E6E6E6")} />
                </TouchableOpacity>
              )}
            </View>
          </LinearGradient>
        </FadeEntrance>

        {/* 3. Core Quick Actions (Uniform Group Card) */}
        <FadeEntrance delay={60}>
          <Text style={styles.sectionHeading}>Resources & Actions</Text>

          <View style={styles.groupCard}>
            {/* Item 1: Grower Guides */}
            <TactileTouchable
              onPress={() => router.push("/user/GrowerGuides" as any)}
              style={styles.menuRow}
              accessibilityRole="button"
              accessibilityLabel="Grower Guides & Handbooks"
            >
              <View style={styles.menuIconBox}>
                <Ionicons name="book-outline" size={19} color={themeColor("#34594A", "#E6E6E6")} />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuTitle}>Grower Guides & Handbooks</Text>
                <Text style={styles.menuDescription}>
                  RSBSA verification, harvest pricing & packaging standards
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color={themeColor("#A2B0A6", "#E6E6E6")} />
            </TactileTouchable>

            <View style={styles.divider} />

            {/* Item 2: Report an Issue */}
            <TactileTouchable
              onPress={() => setReportModalOpen(true)}
              style={styles.menuRow}
              accessibilityRole="button"
              accessibilityLabel="Report an issue or dispute"
            >
              <View style={[styles.menuIconBox, { backgroundColor: themeColor("#FDF1EB", "#181818") }]}>
                <Ionicons name="alert-circle-outline" size={19} color="#B25538" />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuTitle}>Report an Issue or Dispute</Text>
                <Text style={styles.menuDescription}>
                  File transaction issues, fake listings, buyer no-shows, or bugs
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color={themeColor("#A2B0A6", "#E6E6E6")} />
            </TactileTouchable>

            <View style={styles.divider} />

            {/* Item 3: Support Inbox / My Tickets */}
            <TactileTouchable
              onPress={() => setTicketsModalOpen(true)}
              style={styles.menuRow}
              accessibilityRole="button"
              accessibilityLabel="Support Inbox & Status"
            >
              <View style={styles.menuIconBox}>
                <Ionicons name="receipt-outline" size={19} color={themeColor("#34594A", "#E6E6E6")} />
              </View>
              <View style={styles.menuTextWrap}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={styles.menuTitle}>Support Inbox & Tickets</Text>
                  {tickets.length > 0 && (
                    <View style={styles.smallCountBadge}>
                      <Text style={styles.smallCountText}>{tickets.length}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.menuDescription}>
                  {activeTicketsCount > 0
                    ? `${activeTicketsCount} ticket(s) currently under review`
                    : "Track resolution status of your reports and inquiries"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color={themeColor("#A2B0A6", "#E6E6E6")} />
            </TactileTouchable>

            <View style={styles.divider} />

            {/* Item 4: Community Guidelines & Policies */}
            <TactileTouchable
              onPress={() => setPolicyModalOpen(true)}
              style={styles.menuRow}
              accessibilityRole="button"
              accessibilityLabel="Community & Trading Guidelines"
            >
              <View style={styles.menuIconBox}>
                <Ionicons name="shield-checkmark-outline" size={19} color={themeColor("#34594A", "#E6E6E6")} />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuTitle}>Community & Trading Policies</Text>
                <Text style={styles.menuDescription}>
                  Standards for honest trading, produce quality & conduct
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color={themeColor("#A2B0A6", "#E6E6E6")} />
            </TactileTouchable>
          </View>
        </FadeEntrance>

        {/* 4. Frequently Asked Questions (Accordion) */}
        <FadeEntrance delay={100}>
          <View style={styles.faqHeaderRow}>
            <Text style={styles.sectionHeading}>Frequently Asked Questions</Text>
            <Text style={styles.faqCountText}>({filteredFaqs.length})</Text>
          </View>

          {/* Category Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {[
              { id: "all", label: "All Questions" },
              { id: "rsbsa", label: "RSBSA & Badges" },
              { id: "trading", label: "Trading & Orders" },
              { id: "disputes", label: "Disputes & Safety" },
              { id: "account", label: "Account & Security" },
            ].map((cat) => {
              const isActive = selectedCategory === cat.id;
              const highlighted = isActive || hoveredFaqCategory === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setSelectedCategory(cat.id)}
                  onHoverIn={() => setHoveredFaqCategory(cat.id)}
                  onHoverOut={() => setHoveredFaqCategory(null)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                  style={({ pressed }) => [styles.filterChip, highlighted && styles.filterChipActive, pressed && { opacity: 0.8 }]}

                >
                  <Text style={[styles.filterChipText, highlighted && styles.filterChipTextActive]}>
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* FAQ Accordion List */}
          <View style={styles.groupCard}>
            {filteredFaqs.length === 0 ? (
              <View style={styles.emptyFaqBox}>
                <Ionicons name="search-outline" size={26} color={themeColor("#839589", "#E6E6E6")} />
                <Text style={styles.emptyFaqTitle}>No matching questions found</Text>
                <Text style={styles.emptyFaqSubtitle}>
                  Try another keyword or submit an inquiry using the Report button above.
                </Text>
              </View>
            ) : (
              filteredFaqs.map((faq, index) => {
                const isExpanded = expandedFaqId === faq.id;
                const isLast = index === filteredFaqs.length - 1;

                return (
                  <View key={faq.id}>
                    <TouchableOpacity
                      onPress={() => toggleFaq(faq.id)}
                      activeOpacity={0.7}
                      style={styles.faqRow}
                    >
                      <View style={styles.faqQuestionWrap}>
                        <Text style={[styles.faqQuestion, isExpanded && styles.faqQuestionActive]}>
                          {faq.question}
                        </Text>
                      </View>
                      <View style={[styles.faqChevron, isExpanded && styles.faqChevronRotated]}>
                        <Ionicons
                          name="chevron-down"
                          size={18}
                          color={isExpanded ? "#28483B" : "#8A9A90"}
                        />
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.faqAnswerContainer}>
                        <Text style={styles.faqAnswer}>{faq.answer}</Text>

                        {faq.actionText && (
                          <TouchableOpacity
                            onPress={() => handleFaqAction(faq)}
                            style={styles.faqActionBtn}
                            activeOpacity={0.75}
                          >
                            <Ionicons
                              name={faq.actionIcon || "arrow-forward-outline"}
                              size={15}
                              color={themeColor("#28483B", "#E6E6E6")}
                            />
                            <Text style={styles.faqActionBtnText}>{faq.actionText}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}

                    {!isLast && <View style={styles.divider} />}
                  </View>
                );
              })
            )}
          </View>
        </FadeEntrance>

        {/* 5. Contact Official Channels (Uniform Card) */}
        <FadeEntrance delay={140}>
          <Text style={styles.sectionHeading}>Contact & Direct Support</Text>

          <View style={styles.groupCard}>
            {/* Hotline */}
            <TactileTouchable onPress={handleCallHotline} style={styles.menuRow}>
              <View style={styles.menuIconBox}>
                <Ionicons name="call-outline" size={19} color={themeColor("#34594A", "#E6E6E6")} />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuTitle}>DA Agricultural Hotline</Text>
                <Text style={styles.menuDescription}>(02) 8928-8741 • Mon–Sat 7:00 AM - 6:00 PM</Text>
              </View>
              <View style={styles.callBadge}>
                <Text style={styles.callBadgeText}>Call</Text>
              </View>
            </TactileTouchable>

            <View style={styles.divider} />

            {/* Email */}
            <TactileTouchable onPress={handleEmailSupport} style={styles.menuRow}>
              <View style={styles.menuIconBox}>
                <Ionicons name="mail-outline" size={19} color={themeColor("#34594A", "#E6E6E6")} />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuTitle}>Email Support Desk</Text>
                <Text style={styles.menuDescription}>support@localfarm.ph • 24hr response</Text>
              </View>
              <Ionicons name="open-outline" size={17} color={themeColor("#A2B0A6", "#E6E6E6")} />
            </TactileTouchable>
          </View>
        </FadeEntrance>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ============================================================ */}
      {/* MODAL 1: PREMIUM CLEAN REPORT AN ISSUE FORM                  */}
      {/* ============================================================ */}
      <Modal
        visible={isReportModalOpen}
        animationType="slide"
        onRequestClose={() => setReportModalOpen(false)}
      >
        <SafeAreaView style={styles.screen}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setReportModalOpen(false)}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Cancel report"
            >
              <Ionicons name="close" size={22} color={themeColor("#34594A", "#E6E6E6")} />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>Submit Incident Report</Text>
            <View style={{ width: 36 }} />
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
          >
            <ScrollView
              style={{ flex: 1, backgroundColor: themeColor("#FAF9F5", "#181818") }}
              contentContainerStyle={{ padding: 18, paddingBottom: 50 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Subtle Trust Badge */}
              <View style={styles.trustBanner}>
                <Ionicons name="shield-checkmark" size={18} color={themeColor("#275432", "#E6E6E6")} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.trustBannerTitle}>
                    Official Incident & Dispute Channel
                  </Text>
                  <Text style={styles.trustBannerBody}>
                    Reports are formally logged and investigated by LocalFarm agricultural officers and moderators.
                  </Text>
                </View>
              </View>

              {/* 1. SELECTABLE ISSUE CLASSIFICATION (COMPACT DROPDOWN TRIGGER) */}
              <View style={styles.formSectionGroup}>
                <Text style={styles.formSectionTitle}>1. Issue Classification *</Text>
                <Text style={styles.fieldHelpText}>
                  Choose the category that best describes the incident
                </Text>

                <TouchableOpacity
                  onPress={() => setCategoryDropdownOpen(true)}
                  style={styles.dropdownTrigger}
                  activeOpacity={0.8}
                >
                  <View style={styles.dropdownIconCircle}>
                    <Ionicons
                      name={selectedCategoryObj.icon}
                      size={18}
                      color={themeColor("#28483B", "#E6E6E6")}
                    />
                  </View>
                  <View style={{ flex: 1, paddingRight: 6 }}>
                    <Text style={styles.dropdownTitle}>
                      {selectedCategoryObj.label}
                    </Text>
                    <Text numberOfLines={1} style={styles.dropdownSubtitle}>
                      {selectedCategoryObj.shortDesc}
                    </Text>
                  </View>
                  <View style={styles.dropdownChevronCircle}>
                    <Ionicons name="chevron-down" size={17} color={themeColor("#526658", "#E6E6E6")} />
                  </View>
                </TouchableOpacity>
              </View>

              {/* 2. STATE THE SPECIFIC ISSUE */}
              <View style={styles.formSectionGroup}>
                <Text style={styles.formSectionTitle}>2. State the Specific Issue *</Text>
                <Text style={styles.fieldHelpText}>
                  Provide a concise summary statement of what occurred
                </Text>
                <TextInput
                  value={reportSubject}
                  onChangeText={setReportSubject}
                  placeholder="e.g. Buyer submitted a forged GCash screenshot and did not send payment"
                  placeholderTextColor={themeColor("#95A39A", "#E6E6E6")}
                  style={styles.textInput}
                />
              </View>

              {/* 3. REPORTED USER OR PROFILE LINK */}
              <View style={styles.formSectionGroup}>
                <Text style={styles.formSectionTitle}>
                  3. Reported User or Profile Link
                </Text>
                <Text style={styles.fieldHelpText}>
                  Username, name, or profile link of the person being reported (Optional)
                </Text>
                <View style={styles.inputWithPrefixWrapper}>
                  <View style={styles.prefixBadge}>
                    <Ionicons name="at" size={17} color={themeColor("#34594A", "#E6E6E6")} />
                  </View>
                  <TextInput
                    value={reportReportedUser}
                    onChangeText={setReportReportedUser}
                    placeholder="username (e.g. juandelacruz) or profile link"
                    placeholderTextColor={themeColor("#95A39A", "#E6E6E6")}
                    style={styles.inputWithPrefix}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* 4. DETAILED STATEMENT / INCIDENT DESCRIPTION */}
              <View style={styles.formSectionGroup}>
                <View style={styles.labelWithCounterRow}>
                  <Text style={styles.formSectionTitle}>
                    4. Statement of Incident / Description *
                  </Text>
                  {reportDescription.length > 0 && (
                    <Text style={styles.charCounterText}>
                      {reportDescription.length} chars
                    </Text>
                  )}
                </View>
                <Text style={styles.fieldHelpText}>
                  Provide relevant dates, agreed harvest quantities, pickup hub location, and chat context
                </Text>
                <TextInput
                  value={reportDescription}
                  onChangeText={setReportDescription}
                  placeholder="Provide a detailed description of what happened..."
                  placeholderTextColor={themeColor("#95A39A", "#E6E6E6")}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  style={styles.textAreaInput}
                />
              </View>

              {/* 5. SUPPORTING EVIDENCE PICTURE */}
              <View style={styles.formSectionGroup}>
                <Text style={styles.formSectionTitle}>5. Supporting Evidence Picture</Text>
                <Text style={styles.fieldHelpText}>
                  Attach screenshots of chat messages, payment slips, or photos of the produce
                </Text>

                {evidenceImage ? (
                  <View style={styles.evidenceContainer}>
                    <Image
                      source={{ uri: evidenceImage }}
                      style={styles.evidenceImagePreview}
                      resizeMode="cover"
                    />
                    <View style={styles.evidenceControlRow}>
                      <View style={styles.evidenceStatusPill}>
                        <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                        <Text style={styles.evidenceStatusText}>1 Photo Attached</Text>
                      </View>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <TouchableOpacity
                          onPress={handlePickFromGallery}
                          style={styles.changePhotoBtn}
                          activeOpacity={0.75}
                        >
                          <Ionicons name="images-outline" size={14} color={themeColor("#28483B", "#E6E6E6")} />
                          <Text style={styles.changePhotoBtnText}>Replace</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => setEvidenceImage(null)}
                          style={styles.deletePhotoBtn}
                          activeOpacity={0.75}
                        >
                          <Ionicons name="trash-outline" size={14} color="#B23B2A" />
                          <Text style={styles.deletePhotoBtnText}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={styles.evidenceUploadCard}>
                    <View style={styles.uploadIconCircle}>
                      <Ionicons name="cloud-upload-outline" size={24} color={themeColor("#34594A", "#E6E6E6")} />
                    </View>
                    <Text style={styles.uploadCardTitle}>Attach Evidence Photo</Text>
                    <Text style={styles.uploadCardSubtitle}>
                      Screenshots of chat conversations, payment transaction receipts, or damaged produce photos (JPG, PNG)
                    </Text>
                    <View style={styles.uploadButtonsRow}>
                      <TouchableOpacity
                        onPress={handlePickFromGallery}
                        style={styles.uploadActionBtn}
                        activeOpacity={0.75}
                      >
                        <Ionicons name="images-outline" size={15} color={themeColor("#28483B", "#E6E6E6")} />
                        <Text style={styles.uploadActionBtnText}>Choose from Gallery</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleCapturePhoto}
                        style={styles.uploadActionBtn}
                        activeOpacity={0.75}
                      >
                        <Ionicons name="camera-outline" size={15} color={themeColor("#28483B", "#E6E6E6")} />
                        <Text style={styles.uploadActionBtnText}>Take Photo</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              {/* Submit Button */}
              <TactileTouchable
                onPress={handleSubmitReport}
                disabled={isSubmittingReport}
                style={[styles.submitReportBtn, isSubmittingReport && { opacity: 0.7 }]}
                activeOpacity={0.85}
              >
                {isSubmittingReport ? (
                  <ActivityIndicator color={themeColor("#FFFFFF", "#181818")} size="small" />
                ) : (
                  <>
                    <Ionicons name="shield-checkmark" size={18} color={themeColor("#FFFFFF", "#181818")} />
                    <Text style={styles.submitReportBtnText}>
                      Submit Formal Incident Report
                    </Text>
                  </>
                )}
              </TactileTouchable>

              <Text style={styles.legalDisclaimer}>
                All incident filings are confidential and reviewed within 12–24 hours by LocalFarm municipal moderators.
              </Text>
            </ScrollView>
          </KeyboardAvoidingView>

          {/* ============================================================ */}
          {/* CATEGORY DROPDOWN PICKER (SLEEK BOTTOM SHEET)                */}
          {/* ============================================================ */}
          <Modal
            visible={isCategoryDropdownOpen}
            animationType="fade"
            transparent={true}
            onRequestClose={() => setCategoryDropdownOpen(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.dropdownSheet}>
                <View style={styles.sheetHandle} />

                <View style={styles.sheetHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sheetTitle}>Select Issue Classification</Text>
                    <Text style={styles.sheetSubtitle}>
                      Choose the category that best describes your report
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setCategoryDropdownOpen(false)}
                    style={styles.sheetCloseBtn}
                  >
                    <Ionicons name="close" size={20} color={themeColor("#34594A", "#E6E6E6")} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 24, gap: 8 }}
                >
                  {FORMAL_REPORT_CATEGORIES.map((cat) => {
                    const isSelected = reportCategory === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => {
                          setReportCategory(cat.id);
                          setCategoryDropdownOpen(false);
                        }}
                        style={[
                          styles.categoryOptionRow,
                          isSelected && styles.categoryOptionRowActive,
                        ]}
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.optionIconCircle,
                            isSelected && styles.optionIconCircleActive,
                          ]}
                        >
                          <Ionicons
                            name={cat.icon}
                            size={18}
                            color={isSelected ? "#FFFFFF" : "#34594A"}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.optionLabel,
                              isSelected && styles.optionLabelActive,
                            ]}
                          >
                            {cat.label}
                          </Text>
                          <Text style={styles.optionDescription}>
                            {cat.shortDesc}
                          </Text>
                        </View>
                        {isSelected && (
                          <View style={styles.optionCheckCircle}>
                            <Ionicons name="checkmark" size={13} color={themeColor("#FFFFFF", "#181818")} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          </Modal>
        </SafeAreaView>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL 2: SUPPORT TICKETS & RESOLUTION INBOX                  */}
      {/* ============================================================ */}
      <Modal
        visible={isTicketsModalOpen}
        animationType="slide"
        onRequestClose={() => {
          setSelectedTicketDetail(null);
          setTicketsModalOpen(false);
        }}
      >
        <SafeAreaView style={styles.screen}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                if (selectedTicketDetail) setSelectedTicketDetail(null);
                else setTicketsModalOpen(false);
              }}
              style={styles.backButton}
              accessibilityRole="button"
            >
              <Ionicons
                name={selectedTicketDetail ? "chevron-back" : "close"}
                size={22}
                color={themeColor("#34594A", "#E6E6E6")}
              />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>
              {selectedTicketDetail ? "Ticket Details" : "Support Tickets"}
            </Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView
            style={{ flex: 1, backgroundColor: themeColor("#FAF9F5", "#181818") }}
            contentContainerStyle={{ padding: 18, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            {selectedTicketDetail ? (
              // Ticket Single View
              <View>
                <View style={styles.ticketDetailCard}>
                  <View style={styles.ticketDetailHeader}>
                    <View style={styles.ticketCategoryBadge}>
                      <Text style={styles.ticketCategoryBadgeText}>
                        {selectedTicketDetail.category}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        selectedTicketDetail.status.includes("Approved") ||
                        selectedTicketDetail.status === "Resolved"
                          ? styles.statusResolved
                          : selectedTicketDetail.status === "Rejected"
                          ? styles.statusRejected
                          : styles.statusUnderReview,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          selectedTicketDetail.status.includes("Approved") ||
                          selectedTicketDetail.status === "Resolved"
                            ? styles.statusResolvedText
                            : selectedTicketDetail.status === "Rejected"
                            ? styles.statusRejectedText
                            : styles.statusUnderReviewText,
                        ]}
                      >
                        {selectedTicketDetail.status}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.ticketDetailSubject}>{selectedTicketDetail.subject}</Text>
                  <Text style={styles.ticketDetailMeta}>
                    Ref: {selectedTicketDetail.id} • Filed on {selectedTicketDetail.date}
                  </Text>

                  {selectedTicketDetail.relatedUserOrListing && (
                    <View style={styles.ticketReportedUserPill}>
                      <Ionicons name="person-outline" size={13} color={themeColor("#28483B", "#E6E6E6")} />
                      <Text style={styles.ticketReportedUserText}>
                        Reported User: {selectedTicketDetail.relatedUserOrListing}
                      </Text>
                    </View>
                  )}

                  <View style={styles.ticketDivider} />

                  <Text style={styles.ticketSectionTitle}>Report Statement</Text>
                  <Text style={styles.ticketDetailBody}>{selectedTicketDetail.description}</Text>

                  {/* Attached Evidence Image */}
                  {selectedTicketDetail.attachments && selectedTicketDetail.attachments.length > 0 && (
                    <View style={{ marginTop: 12 }}>
                      <Text style={styles.ticketSectionTitle}>Attached Evidence</Text>
                      <View style={styles.detailEvidenceImageWrapper}>
                        <Image
                          source={{ uri: selectedTicketDetail.attachments[0] }}
                          style={styles.detailEvidenceImage}
                          resizeMode="cover"
                        />
                      </View>
                    </View>
                  )}

                  {selectedTicketDetail.resolutionNotes && (
                    <View style={styles.resolutionBox}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <Ionicons name="shield-checkmark" size={17} color={themeColor("#2F5938", "#E6E6E6")} />
                        <Text style={styles.resolutionTitle}>Moderator Resolution</Text>
                      </View>
                      <Text style={styles.resolutionText}>
                        {selectedTicketDetail.resolutionNotes}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ) : (
              // Tickets List View
              <View>
                <Text style={styles.sectionHeading}>Your Inquiries & Reports</Text>
                {tickets.length === 0 ? (
                  <View style={styles.emptyTicketsBox}>
                    <Ionicons name="receipt-outline" size={32} color={themeColor("#87998D", "#E6E6E6")} />
                    <Text style={styles.emptyFaqTitle}>No support tickets yet</Text>
                    <Text style={styles.emptyFaqSubtitle}>
                      Reports and verification inquiries you submit will appear here with resolution updates.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.groupCard}>
                    {tickets.map((t, idx) => {
                      const isLast = idx === tickets.length - 1;
                      const isResolved =
                        t.status === "Resolved" || t.status.includes("Approved");
                      const isRejected = t.status === "Rejected";

                      return (
                        <View key={t.id}>
                          <TouchableOpacity
                            onPress={() => setSelectedTicketDetail(t)}
                            style={styles.ticketRow}
                            activeOpacity={0.7}
                          >
                            <View style={{ flex: 1, marginRight: 10 }}>
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                <Text style={styles.ticketIdText}>{t.id}</Text>
                                <View
                                  style={[
                                    styles.smallStatusBadge,
                                    isResolved
                                      ? styles.statusResolved
                                      : isRejected
                                      ? styles.statusRejected
                                      : styles.statusUnderReview,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.smallStatusText,
                                      isResolved
                                        ? styles.statusResolvedText
                                        : isRejected
                                        ? styles.statusRejectedText
                                        : styles.statusUnderReviewText,
                                    ]}
                                  >
                                    {t.status}
                                  </Text>
                                </View>
                              </View>
                              <Text numberOfLines={1} style={styles.ticketSubjectText}>
                                {t.subject}
                              </Text>
                              <Text style={styles.ticketDateText}>{t.date}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={17} color={themeColor("#A2B0A6", "#E6E6E6")} />
                          </TouchableOpacity>
                          {!isLast && <View style={styles.divider} />}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL 3: COMMUNITY & TRADING GUIDELINES                      */}
      {/* ============================================================ */}
      <Modal
        visible={isPolicyModalOpen}
        animationType="slide"
        onRequestClose={() => setPolicyModalOpen(false)}
      >
        <SafeAreaView style={styles.screen}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setPolicyModalOpen(false)}
              style={styles.backButton}
              accessibilityRole="button"
            >
              <Ionicons name="close" size={22} color={themeColor("#34594A", "#E6E6E6")} />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>Trading Standards</Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView
            style={{ flex: 1, backgroundColor: themeColor("#FAF9F5", "#181818") }}
            contentContainerStyle={{ padding: 18, paddingBottom: 40 }}
          >
            <View style={styles.policyCard}>
              <View style={styles.policyRow}>
                <Ionicons name="leaf" size={20} color={themeColor("#2F5938", "#E6E6E6")} />
                <Text style={styles.policyTitle}>Produce Truth-in-Advertising</Text>
              </View>
              <Text style={styles.policyText}>
                All harvest listings, crop weights, varieties, and estimated harvest dates must be accurate. Uploading stock photos of produce not grown in your farm is prohibited.
              </Text>
            </View>

            <View style={styles.policyCard}>
              <View style={styles.policyRow}>
                <Ionicons name="hand-left" size={20} color="#B25538" />
                <Text style={styles.policyTitle}>Anti-Hoarding & Price Fair Use</Text>
              </View>
              <Text style={styles.policyText}>
                LocalFarm strictly enforces Department of Agriculture suggested retail price (SRP) caps during seasonal agricultural shortages and calamities. Price-gouging leads to immediate listing suspension.
              </Text>
            </View>

            <View style={styles.policyCard}>
              <View style={styles.policyRow}>
                <Ionicons name="shield-checkmark" size={20} color={themeColor("#2F5938", "#E6E6E6")} />
                <Text style={styles.policyTitle}>RSBSA Verified Merchant Conduct</Text>
              </View>
              <Text style={styles.policyText}>
                Farmers holding the Green Verified Badge represent the municipal agricultural community. Verified members receive preferred placement but must honor confirmed reservation contracts.
              </Text>
            </View>

            <View style={styles.policyCard}>
              <View style={styles.policyRow}>
                <Ionicons name="chatbubbles" size={20} color={themeColor("#34594A", "#E6E6E6")} />
                <Text style={styles.policyTitle}>Respectful Community Discussions</Text>
              </View>
              <Text style={styles.policyText}>
                Harassment, discriminatory remarks, or unsolicited commercial spam are not tolerated in public feeds or direct messages. Violations may result in restricted messaging privileges.
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (themeColor: (light: string, dark: string) => string) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: themeColor("#FAF9F5", "#181818"),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: themeColor("#FAF9F5", "#181818"),
    borderBottomWidth: 1,
    borderBottomColor: themeColor("#EDF0EB", "#414141"),
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: themeColor("#23382D", "#E6E6E6"),
    letterSpacing: -0.3,
  },
  ticketBadgeButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  activeDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E53E3E",
    borderWidth: 1.5,
    borderColor: themeColor("#FAF9F5", "#414141"),
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },

  // Hero
  heroBanner: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    shadowColor: "#293E33",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 6,
  },
  heroIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    color: themeColor("#FFFFFF", "#E6E6E6"),
    fontWeight: "700",
    fontSize: 16,
  },
  heroSubtitle: {
    color: themeColor("#E0EBE4", "#E6E6E6"),
    fontSize: 12,
  },
  heroDescription: {
    color: themeColor("#D4E4DA", "#E6E6E6"),
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 14,
  },
  heroSearchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: themeColor("#FFFFFF", "#242424"),
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  heroSearchInput: {
    flex: 1,
    fontSize: 13,
    color: themeColor("#23382D", "#E6E6E6"),
    paddingVertical: 0,
  },

  // Headings
  sectionHeading: {
    fontSize: 12.5,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: themeColor("#738579", "#E6E6E6"),
    marginBottom: 8,
    marginLeft: 4,
  },
  groupCard: {
    backgroundColor: themeColor("#FFFFFF", "#242424"),
    borderRadius: 20,
    borderWidth: 1,
    borderColor: themeColor("#E5ECE6", "#414141"),
    shadowColor: "#293E33",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 6,
    elevation: 1,
    overflow: "hidden",
    marginBottom: 22,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: themeColor("#EDF3EE", "#181818"),
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  menuTextWrap: {
    flex: 1,
    marginRight: 8,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: themeColor("#2C3D32", "#E6E6E6"),
  },
  menuDescription: {
    fontSize: 12,
    color: themeColor("#75867B", "#E6E6E6"),
    marginTop: 2,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: themeColor("#EEF2ED", "#181818"),
    marginLeft: 70,
  },
  smallCountBadge: {
    backgroundColor: themeColor("#EDF2EC", "#181818"),
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  smallCountText: {
    fontSize: 11,
    fontWeight: "700",
    color: themeColor("#34594A", "#E6E6E6"),
  },

  // FAQs
  faqHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: 4,
  },
  faqCountText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: themeColor("#738579", "#E6E6E6"),
    marginBottom: 8,
  },
  chipsScroll: {
    gap: 8,
    paddingBottom: 10,
    paddingHorizontal: 2,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: themeColor("#EBF0EB", "#181818"),
  },
  filterChipActive: {
    backgroundColor: "#34594A",
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: themeColor("#54685C", "#E6E6E6"),
  },
  filterChipTextActive: {
    color: themeColor("#FFFFFF", "#E6E6E6"),
  },
  faqRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  faqQuestionWrap: {
    flex: 1,
    paddingRight: 12,
  },
  faqQuestion: {
    fontSize: 13.5,
    fontWeight: "600",
    color: themeColor("#2B3C31", "#E6E6E6"),
    lineHeight: 19,
  },
  faqQuestionActive: {
    color: themeColor("#1F4231", "#E6E6E6"),
  },
  faqChevron: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  faqChevronRotated: {
    transform: [{ rotate: "180deg" }],
  },
  faqAnswerContainer: {
    backgroundColor: themeColor("#F8FAF7", "#181818"),
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
  },
  faqAnswer: {
    fontSize: 12.5,
    lineHeight: 19,
    color: themeColor("#57695E", "#E6E6E6"),
  },
  faqActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: themeColor("#E8F0E6", "#181818"),
  },
  faqActionBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: themeColor("#28483B", "#E6E6E6"),
  },
  emptyFaqBox: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  emptyFaqTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: themeColor("#384D3E", "#E6E6E6"),
    marginTop: 8,
  },
  emptyFaqSubtitle: {
    fontSize: 12,
    color: themeColor("#839589", "#E6E6E6"),
    textAlign: "center",
    marginTop: 4,
    lineHeight: 17,
  },

  // Contact
  callBadge: {
    backgroundColor: themeColor("#E8F2E6", "#181818"),
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  callBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: themeColor("#2B5239", "#E6E6E6"),
  },

  // Modals General
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: themeColor("#FAF9F5", "#181818"),
    borderBottomWidth: 1,
    borderBottomColor: themeColor("#EDF0EB", "#414141"),
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: themeColor("#23382D", "#E6E6E6"),
  },

  // Premium Incident Report Styling
  trustBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: themeColor("#F2F6F3", "#181818"),
    borderRadius: 14,
    padding: 13,
    borderWidth: 1,
    borderColor: themeColor("#E0E9E2", "#414141"),
    marginBottom: 20,
  },
  trustBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: themeColor("#24452E", "#E6E6E6"),
  },
  trustBannerBody: {
    fontSize: 11.5,
    lineHeight: 16,
    color: themeColor("#5B7062", "#E6E6E6"),
    marginTop: 2,
  },
  formSectionGroup: {
    marginBottom: 16,
  },
  formSectionTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: themeColor("#23392D", "#E6E6E6"),
    marginBottom: 2,
  },
  fieldHelpText: {
    fontSize: 11.5,
    color: themeColor("#74857A", "#E6E6E6"),
    marginBottom: 8,
    lineHeight: 16,
  },
  labelWithCounterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  charCounterText: {
    fontSize: 11,
    fontWeight: "600",
    color: themeColor("#84958A", "#E6E6E6"),
  },

  // Compact Dropdown Trigger
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: themeColor("#FFFFFF", "#242424"),
    borderRadius: 14,
    borderWidth: 1,
    borderColor: themeColor("#E0E7DF", "#414141"),
    padding: 12,
    gap: 12,
    shadowColor: "#293E33",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  dropdownIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: themeColor("#EDF3EE", "#181818"),
    alignItems: "center",
    justifyContent: "center",
  },
  dropdownTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: themeColor("#24382C", "#E6E6E6"),
  },
  dropdownSubtitle: {
    fontSize: 11.5,
    color: themeColor("#718377", "#E6E6E6"),
    marginTop: 1,
  },
  dropdownChevronCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: themeColor("#F3F6F3", "#181818"),
    alignItems: "center",
    justifyContent: "center",
  },

  // Bottom Sheet Modal (Dropdown)
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(22, 35, 27, 0.48)",
  },
  dropdownSheet: {
    backgroundColor: themeColor("#FFFFFF", "#242424"),
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderColor: themeColor("#E5ECE6", "#414141"),
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: themeColor("#D8E2DA", "#303030"),
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: themeColor("#23382D", "#E6E6E6"),
  },
  sheetSubtitle: {
    fontSize: 12,
    color: themeColor("#74867A", "#E6E6E6"),
    marginTop: 2,
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: themeColor("#F1F5F2", "#181818"),
    alignItems: "center",
    justifyContent: "center",
  },
  categoryOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: themeColor("#FFFFFF", "#242424"),
    borderRadius: 14,
    borderWidth: 1,
    borderColor: themeColor("#E8EFE9", "#414141"),
    padding: 12,
    gap: 12,
  },
  categoryOptionRowActive: {
    backgroundColor: themeColor("#F4F8F4", "#181818"),
    borderColor: themeColor("#28483B", "#414141"),
  },
  optionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: themeColor("#EDF3EE", "#181818"),
    alignItems: "center",
    justifyContent: "center",
  },
  optionIconCircleActive: {
    backgroundColor: themeColor("#28483B", "#E6E6E6"),
  },
  optionLabel: {
    fontSize: 13.5,
    fontWeight: "600",
    color: themeColor("#2C3D32", "#E6E6E6"),
  },
  optionLabelActive: {
    color: themeColor("#1F3F2C", "#E6E6E6"),
    fontWeight: "700",
  },
  optionDescription: {
    fontSize: 11.5,
    color: themeColor("#788A7F", "#E6E6E6"),
    marginTop: 1,
  },
  optionCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: themeColor("#28483B", "#E6E6E6"),
    alignItems: "center",
    justifyContent: "center",
  },

  // Text Inputs
  textInput: {
    backgroundColor: themeColor("#FFFFFF", "#242424"),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: themeColor("#E0E6DF", "#414141"),
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13.5,
    color: themeColor("#27382E", "#E6E6E6"),
  },
  inputWithPrefixWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: themeColor("#FFFFFF", "#242424"),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: themeColor("#E0E6DF", "#414141"),
    overflow: "hidden",
  },
  prefixBadge: {
    width: 40,
    height: 44,
    backgroundColor: themeColor("#EDF3EE", "#181818"),
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: themeColor("#E0E6DF", "#414141"),
  },
  inputWithPrefix: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 13.5,
    color: themeColor("#27382E", "#E6E6E6"),
  },
  textAreaInput: {
    backgroundColor: themeColor("#FFFFFF", "#242424"),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: themeColor("#E0E6DF", "#414141"),
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13.5,
    color: themeColor("#27382E", "#E6E6E6"),
    minHeight: 115,
  },

  // Evidence Picture Upload
  evidenceUploadCard: {
    backgroundColor: themeColor("#FFFFFF", "#242424"),
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: themeColor("#D7E2D9", "#414141"),
    borderStyle: "dashed",
    padding: 18,
    alignItems: "center",
  },
  uploadIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: themeColor("#EDF3EE", "#181818"),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  uploadCardTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: themeColor("#24392D", "#E6E6E6"),
    marginBottom: 3,
  },
  uploadCardSubtitle: {
    fontSize: 11.5,
    lineHeight: 16,
    color: themeColor("#75887C", "#E6E6E6"),
    textAlign: "center",
    paddingHorizontal: 10,
    marginBottom: 14,
  },
  uploadButtonsRow: {
    flexDirection: "row",
    gap: 10,
  },
  uploadActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: themeColor("#EDF3EE", "#181818"),
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
  },
  uploadActionBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: themeColor("#28483B", "#E6E6E6"),
  },

  // Evidence Preview
  evidenceContainer: {
    backgroundColor: themeColor("#FFFFFF", "#242424"),
    borderRadius: 16,
    borderWidth: 1,
    borderColor: themeColor("#E2E8E1", "#414141"),
    padding: 12,
  },
  evidenceImagePreview: {
    width: "100%",
    height: 190,
    borderRadius: 12,
    backgroundColor: themeColor("#EDF2EC", "#181818"),
  },
  evidenceControlRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingHorizontal: 2,
  },
  evidenceStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  evidenceStatusText: {
    fontSize: 12,
    fontWeight: "600",
    color: themeColor("#2A4E35", "#E6E6E6"),
  },
  changePhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: themeColor("#EDF3EE", "#181818"),
  },
  changePhotoBtnText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: themeColor("#28483B", "#E6E6E6"),
  },
  deletePhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: themeColor("#FDF0EE", "#181818"),
  },
  deletePhotoBtnText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#B23B2A",
  },

  // Form Submit & Legal
  submitReportBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: themeColor("#28483B", "#E6E6E6"),
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginTop: 6,
    shadowColor: "#293E33",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  submitReportBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: themeColor("#FFFFFF", "#E6E6E6"),
  },
  legalDisclaimer: {
    fontSize: 11,
    lineHeight: 16,
    color: themeColor("#839387", "#E6E6E6"),
    textAlign: "center",
    marginTop: 12,
    paddingHorizontal: 10,
  },

  // Tickets List & Detail
  emptyTicketsBox: {
    backgroundColor: themeColor("#FFFFFF", "#242424"),
    borderRadius: 20,
    borderWidth: 1,
    borderColor: themeColor("#E5ECE6", "#414141"),
    padding: 28,
    alignItems: "center",
  },
  ticketRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  ticketIdText: {
    fontSize: 11,
    fontWeight: "700",
    color: themeColor("#6D8074", "#E6E6E6"),
  },
  smallStatusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  smallStatusText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  ticketSubjectText: {
    fontSize: 13.5,
    fontWeight: "600",
    color: themeColor("#27382E", "#E6E6E6"),
  },
  ticketDateText: {
    fontSize: 11.5,
    color: themeColor("#86968B", "#E6E6E6"),
    marginTop: 2,
  },
  ticketDetailCard: {
    backgroundColor: themeColor("#FFFFFF", "#242424"),
    borderRadius: 20,
    borderWidth: 1,
    borderColor: themeColor("#E5ECE6", "#414141"),
    padding: 18,
    shadowColor: "#293E33",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },
  ticketDetailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  ticketCategoryBadge: {
    backgroundColor: themeColor("#EDF2EC", "#181818"),
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ticketCategoryBadgeText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: themeColor("#375040", "#E6E6E6"),
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11.5,
    fontWeight: "700",
  },
  statusResolved: {
    backgroundColor: themeColor("#E8F3E6", "#181818"),
  },
  statusResolvedText: {
    color: themeColor("#276336", "#E6E6E6"),
  },
  statusRejected: {
    backgroundColor: themeColor("#FDEAE8", "#181818"),
  },
  statusRejectedText: {
    color: "#B83A28",
  },
  statusUnderReview: {
    backgroundColor: themeColor("#FEF4E6", "#181818"),
  },
  statusUnderReviewText: {
    color: "#B26B1E",
  },
  ticketDetailSubject: {
    fontSize: 16,
    fontWeight: "700",
    color: themeColor("#24372B", "#E6E6E6"),
    marginBottom: 4,
  },
  ticketDetailMeta: {
    fontSize: 12,
    color: themeColor("#829388", "#E6E6E6"),
    marginBottom: 8,
  },
  ticketReportedUserPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: themeColor("#EDF3EE", "#181818"),
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  ticketReportedUserText: {
    fontSize: 12,
    fontWeight: "600",
    color: themeColor("#28483B", "#E6E6E6"),
  },
  ticketDivider: {
    height: 1,
    backgroundColor: themeColor("#EEF2ED", "#181818"),
    marginVertical: 14,
  },
  ticketSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    color: themeColor("#6D8074", "#E6E6E6"),
    marginBottom: 6,
  },
  ticketDetailBody: {
    fontSize: 13.5,
    lineHeight: 21,
    color: themeColor("#34473C", "#E6E6E6"),
    marginBottom: 14,
  },
  detailEvidenceImageWrapper: {
    width: "100%",
    height: 220,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: themeColor("#EDF2EC", "#181818"),
    marginBottom: 16,
  },
  detailEvidenceImage: {
    width: "100%",
    height: "100%",
  },
  resolutionBox: {
    backgroundColor: themeColor("#EBF3E8", "#181818"),
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: themeColor("#DCE8D8", "#414141"),
  },
  resolutionTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    color: themeColor("#275432", "#E6E6E6"),
  },
  resolutionText: {
    fontSize: 12.5,
    lineHeight: 19,
    color: themeColor("#36593E", "#E6E6E6"),
  },

  // Policies Modal
  policyCard: {
    backgroundColor: themeColor("#FFFFFF", "#242424"),
    borderRadius: 16,
    borderWidth: 1,
    borderColor: themeColor("#E5ECE6", "#414141"),
    padding: 16,
    marginBottom: 12,
  },
  policyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  policyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: themeColor("#27382E", "#E6E6E6"),
  },
  policyText: {
    fontSize: 12.5,
    lineHeight: 18.5,
    color: themeColor("#5A6D61", "#E6E6E6"),
  },
});
