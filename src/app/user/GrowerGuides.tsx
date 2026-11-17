import { useAppTheme } from "@/context/theme-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Subtle entrance animation matching MenuProfile & HelpSupport
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

interface GuideArticle {
  id: string;
  category:
    | "rsbsa"
    | "pricing"
    | "harvest"
    | "safety"
    | "payments"
    | "packaging";
  categoryLabel: string;
  title: string;
  subtitle: string;
  readTime: string;
  icon: keyof typeof Ionicons.glyphMap;
  badge?: string;
  sections: {
    heading: string;
    content: string;
    points?: string[];
  }[];
  actionButton?: {
    text: string;
    route: string;
    icon: keyof typeof Ionicons.glyphMap;
  };
}

const GUIDE_ARTICLES: GuideArticle[] = [
  {
    id: "g1",
    category: "rsbsa",
    categoryLabel: "RSBSA & Badges",
    title: "How to Get RSBSA Verified & Earn the Green Badge",
    subtitle:
      "A complete guide to government agricultural registration and unlocking trust on Local Farm.",
    readTime: "4 min read",
    icon: "ribbon-outline",
    badge: "Most Important",
    sections: [
      {
        heading: "What is RSBSA?",
        content:
          "The Registry System for Basic Sectors in Agriculture (RSBSA) is an electronic database of Filipino farmers, farm workers, and fisherfolk managed by the Department of Agriculture (DA). It serves as the baseline requirement for agricultural assistance, government subsidies, and official farmer certification.",
      },
      {
        heading: "Who is Eligible to Register?",
        content:
          "Any individual actively engaged in agricultural production within the Philippines:",
        points: [
          "Farmers cultivating rice, corn, rootcrops, high-value vegetables, or fruit trees",
          "Livestock, swine, or poultry smallholder growers",
          "Agricultural laborers and farm tenants with barangay certification",
        ],
      },
      {
        heading: "Benefits of the Green Verified Badge on Local Farm",
        content:
          "Accounts with verified RSBSA certification receive prominent platform advantages:",
        points: [
          "A distinctive green badge next to your farm name across all listings, feed posts, and map pins",
          "Exclusive access to broadcast Live video streams directly from your farm to buyers",
          "3x higher search ranking in Nearby Farms and Explore Map results",
          "Higher buyer trust resulting in immediate upfront bank/GCash deposits",
          "Protection from automated listing volume caps",
        ],
      },
      {
        heading: "How to Apply on Local Farm",
        content:
          "Submit your RSBSA Certificate number or Barangay Farming Certification along with a clear photo of your ID or certificate in the RSBSA Verification tab.",
      },
    ],
    actionButton: {
      text: "Apply for RSBSA Verification",
      route: "/user/RSBSAVerification",
      icon: "checkmark-circle-outline",
    },
  },
  {
    id: "g2",
    category: "pricing",
    categoryLabel: "Harvest & Pricing",
    title: "Setting Fair Produce Prices & Volume Tiers",
    subtitle:
      "How to balance competitive consumer pricing with profitable farm-gate margins.",
    readTime: "3 min read",
    icon: "pricetags-outline",
    sections: [
      {
        heading: "Standardize Your Unit Pricing",
        content:
          "Buyers appreciate clarity. Always specify standardized metric units rather than ambiguous plastic bag sizes:",
        points: [
          "Per kilogram (₱/kg) for vegetables, fruits, and tubers",
          "Per crate / kaing (typically 20kg or 25kg) for bulk fruit pickers",
          "Per bundle for leafy greens (specify approximate weight, e.g., 250g/bundle)",
          "Per sack (50kg) for grains, rootcrops, or animal feeds",
        ],
      },
      {
        heading: "Wholesale & Volume Discounts",
        content:
          "Attract institutional buyers (local karinderyas, restaurants, and market vendors) by offering stepped volume tiers. For instance: ₱60/kg for 1–10kg, and ₱48/kg for orders exceeding 50kg.",
      },
      {
        heading: "Price Transparency Settings",
        content:
          "You can choose whether your pricing is publicly visible to all guests or only to verified registered buyers in Settings > Privacy Center.",
      },
    ],
  },
  {
    id: "g3",
    category: "harvest",
    categoryLabel: "Harvest Scheduling",
    title: "Pre-Orders, Harvest Dates & Typhoon Disruptions",
    subtitle:
      "Mastering harvest listings and keeping buyers informed during unexpected weather delays.",
    readTime: "3 min read",
    icon: "calendar-outline",
    sections: [
      {
        heading: "List Expected Harvests 3–5 Days Early",
        content:
          "Do not wait until the day of harvest to list perishable crops. By listing 3 to 5 days in advance, nearby consumers and businesses can pre-order, eliminating produce spoilage at the farm gate.",
      },
      {
        heading: "Handling Monsoon & Weather Delays",
        content:
          "Heavy rainfall and tropical storms frequently interrupt harvest schedules. If cutting must be postponed:",
        points: [
          "Immediately broadcast an update in Chat to all buyers holding reserved orders",
          "Adjust the expected availability date on your harvest listing",
          "Honest, prompt communication prevents order cancellations and protects your 5-star grower rating",
        ],
      },
    ],
  },
  {
    id: "g4",
    category: "safety",
    categoryLabel: "Farm-Gate Safety",
    title: "Safe Farm-Gate Pickups & Roadside Collection",
    subtitle:
      "Guidelines for protecting your personal homestead while fulfilling buyer pickups.",
    readTime: "3 min read",
    icon: "shield-checkmark-outline",
    badge: "Safety",
    sections: [
      {
        heading: "Use Approximate Map Location",
        content:
          "To safeguard personal farming equipment, machinery, and family homesteads from theft, keep your Explore Map pin set to 'Approximate Area' (a ~1km circular radius).",
      },
      {
        heading: "Designated Public Collection Points",
        content:
          "For buyers you haven't transacted with before, designate a roadside farm-gate landmark, barangay hall outpost, or cooperative warehouse as the pickup rendezvous point rather than your home residence.",
      },
      {
        heading: "Daylight Pickup Windows",
        content:
          "Only schedule order handovers between 7:00 AM and 5:00 PM. Never meet unverified buyers at secluded farm plots after dark.",
      },
    ],
  },
  {
    id: "g5",
    category: "payments",
    categoryLabel: "Payment & Scams",
    title: "Preventing Payment Fraud & Fake Deposit Slips",
    subtitle:
      "Protect your hard-earned harvest against falsified GCash or bank transfer screenshots.",
    readTime: "4 min read",
    icon: "cash-outline",
    badge: "Security",
    sections: [
      {
        heading: "The 'Screenshot Scam' Warning",
        content:
          "Scammers frequently use photo-editing software to forge GCash or online bank transfer confirmation receipts. Never release harvest crates solely because the buyer showed you a screenshot on their phone.",
      },
      {
        heading: "The Golden Rule: Check Your Own Balance",
        content:
          "Always open your own GCash, Maya, or mobile banking application and confirm that the funds have cleared into your actual account balance before loading crops onto the buyer's vehicle.",
      },
      {
        heading: "Buyer No-Shows",
        content:
          "If a buyer reserves bulk produce and fails to arrive without notice, report the incident immediately via 'Report an Issue'. Accounts that repeatedly abandon perishable pre-orders are penalized and banned to protect farmers.",
      },
    ],
    actionButton: {
      text: "Report a Payment Dispute",
      route: "/user/HelpSupport",
      icon: "warning-outline",
    },
  },
  {
    id: "g6",
    category: "packaging",
    categoryLabel: "Packaging & Quality",
    title: "Produce Sorting, Grading & Packaging Standards",
    subtitle:
      "Simple post-harvest practices that command higher prices and repeat buyers.",
    readTime: "3 min read",
    icon: "cube-outline",
    sections: [
      {
        heading: "Grading Produce Fairly (Class A vs Class B)",
        content:
          "Be transparent about cosmetic imperfections. Grade A vegetables (uniform size, zero blemishes) command premium prices. Slightly deformed produce should be offered at discounted 'Processing/Kitchen Grade' rates.",
      },
      {
        heading: "Breathable Storage Containers",
        content:
          "Avoid sealing freshly picked greens in airtight plastic bags under the sun, which induces heat buildup and rapid rotting. Use ventilated plastic harvest crates, wooden boxes, or banana leaf linings for optimal freshness.",
      },
    ],
  },
];

export default function GrowerGuides() {
  const { themeColor } = useAppTheme();
  const styles = createStyles(themeColor);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedGuideId, setExpandedGuideId] = useState<string | null>("g1");

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push("/user/MenuProfile" as any);
    }
  };

  const filteredArticles = useMemo(() => {
    return GUIDE_ARTICLES.filter((article) => {
      const matchesCategory =
        selectedCategory === "all" || article.category === selectedCategory;
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        query === "" ||
        article.title.toLowerCase().includes(query) ||
        article.subtitle.toLowerCase().includes(query) ||
        article.categoryLabel.toLowerCase().includes(query) ||
        article.sections.some(
          (s) =>
            s.heading.toLowerCase().includes(query) ||
            s.content.toLowerCase().includes(query)
        );
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedGuideId((prev) => (prev === id ? null : id));
  };

  return (
    <SafeAreaView style={styles.screen}>
      {/* 1. Uniform Navigation Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color={themeColor("#34594A", "#E6E6E6")} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Grower Guides</Text>

        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: themeColor("#FAF9F5", "#181818") }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 2. Uniform LinearGradient Hero Banner */}
        <FadeEntrance delay={20}>
          <LinearGradient
            colors={["#29483B", "#38604F"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroBanner}
          >
            <View style={styles.heroHeader}>
              <View style={styles.heroIconBox}>
                <Ionicons name="book-outline" size={22} color={themeColor("#FFFFFF", "#E6E6E6")} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroSuperTitle}>
                  GROWER SUCCESS & STANDARDS
                </Text>
                <Text style={styles.heroTitle}>Grow, Sell & Prosper Locally</Text>
              </View>
            </View>
            <Text style={styles.heroDescription}>
              Essential knowledge for smallholder growers: from securing your RSBSA Green Badge to farm-gate pricing ethics, harvest logistics, and scam prevention.
            </Text>

            {/* In-hero Search Bar */}
            <View style={styles.heroSearchContainer}>
              <Ionicons name="search-outline" size={17} color={themeColor("#687C71", "#E6E6E6")} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search guides (e.g. RSBSA, pricing, fake slips)..."
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

        {/* 3. Category Horizontal Filter Chips */}
        <FadeEntrance delay={60}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {[
              { id: "all", label: "All Guides", icon: "grid-outline" },
              { id: "rsbsa", label: "RSBSA & Badges", icon: "ribbon-outline" },
              { id: "pricing", label: "Pricing & Tiers", icon: "pricetags-outline" },
              { id: "harvest", label: "Harvest & Pre-orders", icon: "calendar-outline" },
              { id: "safety", label: "Farm-gate Safety", icon: "shield-checkmark-outline" },
              { id: "payments", label: "Scam Prevention", icon: "cash-outline" },
              { id: "packaging", label: "Packaging & Quality", icon: "cube-outline" },
            ].map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCategory(cat.id)}
                  style={[styles.filterChip, isSelected && styles.filterChipActive]}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={cat.icon as any}
                    size={14}
                    color={themeColor(isSelected ? "#FFFFFF" : "#54685C", isSelected ? "#E6E6E6" : "#ADADAD")}
                  />
                  <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </FadeEntrance>

        {/* 4. Articles Section */}
        <FadeEntrance delay={100}>
          <View style={styles.sectionHeadingRow}>
            <Text style={styles.sectionHeading}>Agricultural Guides</Text>
            <Text style={styles.countText}>({filteredArticles.length})</Text>
          </View>

          {filteredArticles.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="book-outline" size={32} color={themeColor("#85978C", "#E6E6E6")} />
              <Text style={styles.emptyTitle}>No guides match your search</Text>
              <Text style={styles.emptySubtitle}>
                Try searching for &quot;RSBSA&quot;, &quot;pricing&quot;, or select another topic filter.
              </Text>
            </View>
          ) : (
            filteredArticles.map((article) => {
              const isExpanded = expandedGuideId === article.id;

              return (
                <View key={article.id} style={styles.guideCard}>
                  {/* Article Card Header */}
                  <TouchableOpacity
                    onPress={() => toggleExpand(article.id)}
                    activeOpacity={0.75}
                    style={styles.guideHeader}
                  >
                    <View style={styles.metaRow}>
                      <View style={styles.metaLeft}>
                        <View style={styles.guideIconBox}>
                          <Ionicons name={article.icon} size={18} color={themeColor("#34594A", "#E6E6E6")} />
                        </View>
                        <View style={styles.categoryBadge}>
                          <Text style={styles.categoryBadgeText}>
                            {article.categoryLabel}
                          </Text>
                        </View>
                        {article.badge && (
                          <View
                            style={[
                              styles.specialBadge,
                              article.badge === "Safety"
                                ? styles.safetyBadge
                                : article.badge === "Security"
                                ? styles.securityBadge
                                : styles.mostImportantBadge,
                            ]}
                          >
                            <Text
                              style={[
                                styles.specialBadgeText,
                                article.badge === "Safety"
                                  ? styles.safetyBadgeText
                                  : article.badge === "Security"
                                  ? styles.securityBadgeText
                                  : styles.mostImportantBadgeText,
                              ]}
                            >
                              {article.badge}
                            </Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.readTimeText}>{article.readTime}</Text>
                    </View>

                    <Text style={styles.guideTitle}>{article.title}</Text>
                    <Text style={styles.guideSubtitle}>{article.subtitle}</Text>

                    <View style={styles.collapseRow}>
                      <Text style={styles.collapseText}>
                        {isExpanded ? "Collapse Guide" : "Read Full Guide"}
                      </Text>
                      <Ionicons
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={16}
                        color={themeColor("#28483B", "#E6E6E6")}
                      />
                    </View>
                  </TouchableOpacity>

                  {/* Expanded Guide Content */}
                  {isExpanded && (
                    <View style={styles.expandedContent}>
                      {article.sections.map((section, sIdx) => (
                        <View key={sIdx} style={styles.sectionBlock}>
                          <Text style={styles.sectionBlockHeading}>
                            {section.heading}
                          </Text>
                          <Text style={styles.sectionBlockBody}>
                            {section.content}
                          </Text>

                          {section.points && (
                            <View style={styles.pointsList}>
                              {section.points.map((pt, pIdx) => (
                                <View key={pIdx} style={styles.pointRow}>
                                  <View style={styles.pointDot} />
                                  <Text style={styles.pointText}>{pt}</Text>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      ))}

                      {/* Optional Action Button */}
                      {article.actionButton && (
                        <TactileTouchable
                          onPress={() => router.push(article.actionButton!.route as any)}
                          style={styles.actionCalloutBtn}
                          activeOpacity={0.8}
                        >
                          <Ionicons
                            name={article.actionButton.icon}
                            size={16}
                            color={themeColor("#FFFFFF", "#E6E6E6")}
                          />
                          <Text style={styles.actionCalloutBtnText}>
                            {article.actionButton.text}
                          </Text>
                        </TactileTouchable>
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </FadeEntrance>

        {/* 5. Uniform Footer Help Desk Card */}
        <FadeEntrance delay={140}>
          <Text style={styles.sectionHeading}>Still Have Questions?</Text>

          <View style={styles.footerCard}>
            <View style={styles.footerIconBox}>
              <Ionicons name="help-buoy-outline" size={26} color={themeColor("#34594A", "#E6E6E6")} />
            </View>
            <Text style={styles.footerTitle}>Have a question not covered here?</Text>
            <Text style={styles.footerDescription}>
              Our municipal agricultural specialists and dispute moderators are available to assist with verification and questions.
            </Text>
            <TactileTouchable
              onPress={() => router.push("/user/HelpSupport" as any)}
              style={styles.footerBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={16} color={themeColor("#FFFFFF", "#E6E6E6")} />
              <Text style={styles.footerBtnText}>Contact Support Desk</Text>
            </TactileTouchable>
          </View>
        </FadeEntrance>

        <View style={{ height: 40 }} />
      </ScrollView>
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },

  // Hero
  heroBanner: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
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
  heroSuperTitle: {
    color: themeColor("#D4E7DC", "#E6E6E6"),
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: themeColor("#FFFFFF", "#E6E6E6"),
    fontWeight: "700",
    fontSize: 16,
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

  // Filter Chips
  chipsScroll: {
    gap: 8,
    paddingBottom: 16,
    paddingHorizontal: 2,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: themeColor("#EBF0EB", "#181818"),
  },
  filterChipActive: {
    backgroundColor: themeColor("#2E523E", "#303030"),
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: themeColor("#54685C", "#ADADAD"),
  },
  filterChipTextActive: {
    color: themeColor("#FFFFFF", "#E6E6E6"),
  },

  // Section Heading
  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionHeading: {
    fontSize: 12.5,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: themeColor("#738579", "#E6E6E6"),
    marginBottom: 8,
    marginLeft: 4,
  },
  countText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: themeColor("#738579", "#E6E6E6"),
    marginBottom: 8,
  },

  // Guide Cards
  guideCard: {
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
    marginBottom: 14,
  },
  guideHeader: {
    padding: 16,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  metaLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  guideIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: themeColor("#EDF3EE", "#181818"),
    alignItems: "center",
    justifyContent: "center",
  },
  categoryBadge: {
    backgroundColor: themeColor("#EDF2EC", "#181818"),
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: themeColor("#375040", "#E6E6E6"),
  },
  specialBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  specialBadgeText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  mostImportantBadge: {
    backgroundColor: themeColor("#FEF4E6", "#181818"),
  },
  mostImportantBadgeText: {
    color: "#B26B1E",
  },
  safetyBadge: {
    backgroundColor: themeColor("#E8F3E6", "#181818"),
  },
  safetyBadgeText: {
    color: themeColor("#276336", "#E6E6E6"),
  },
  securityBadge: {
    backgroundColor: themeColor("#FDF0EE", "#181818"),
  },
  securityBadgeText: {
    color: "#B23B2A",
  },
  readTimeText: {
    fontSize: 11,
    color: themeColor("#88978E", "#E6E6E6"),
    fontWeight: "500",
  },
  guideTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: themeColor("#24372B", "#E6E6E6"),
    lineHeight: 21,
    marginBottom: 4,
  },
  guideSubtitle: {
    fontSize: 12.5,
    color: themeColor("#6D7E73", "#E6E6E6"),
    lineHeight: 17,
    marginBottom: 12,
  },
  collapseRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: themeColor("#EEF2ED", "#414141"),
  },
  collapseText: {
    fontSize: 12,
    fontWeight: "600",
    color: themeColor("#28483B", "#E6E6E6"),
  },

  // Expanded Content
  expandedContent: {
    backgroundColor: themeColor("#F8FAF7", "#181818"),
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: themeColor("#EBF0EA", "#414141"),
  },
  sectionBlock: {
    marginBottom: 14,
  },
  sectionBlockHeading: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: themeColor("#6D8074", "#E6E6E6"),
    marginBottom: 4,
  },
  sectionBlockBody: {
    fontSize: 13,
    lineHeight: 20,
    color: themeColor("#3B4E42", "#E6E6E6"),
  },
  pointsList: {
    marginTop: 6,
    gap: 6,
  },
  pointRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  pointDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: themeColor("#2E523E", "#303030"),
    marginTop: 7,
  },
  pointText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: themeColor("#3B4E42", "#E6E6E6"),
  },
  actionCalloutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: themeColor("#28483B", "#303030"),
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 6,
    shadowColor: "#293E33",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionCalloutBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: themeColor("#FFFFFF", "#E6E6E6"),
  },

  // Empty state
  emptyCard: {
    backgroundColor: themeColor("#FFFFFF", "#242424"),
    borderRadius: 20,
    borderWidth: 1,
    borderColor: themeColor("#E5ECE6", "#414141"),
    padding: 32,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    color: themeColor("#384D3E", "#E6E6E6"),
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    color: themeColor("#839589", "#E6E6E6"),
    textAlign: "center",
    marginTop: 4,
    lineHeight: 17,
  },

  // Footer Card
  footerCard: {
    backgroundColor: themeColor("#FFFFFF", "#242424"),
    borderRadius: 20,
    borderWidth: 1,
    borderColor: themeColor("#E5ECE6", "#414141"),
    padding: 20,
    alignItems: "center",
    shadowColor: "#293E33",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 6,
    elevation: 1,
  },
  footerIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: themeColor("#EDF3EE", "#181818"),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  footerTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    color: themeColor("#24372B", "#E6E6E6"),
    textAlign: "center",
    marginBottom: 4,
  },
  footerDescription: {
    fontSize: 12,
    lineHeight: 17,
    color: themeColor("#6F8075", "#E6E6E6"),
    textAlign: "center",
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  footerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: themeColor("#28483B", "#303030"),
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: "#293E33",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  footerBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: themeColor("#FFFFFF", "#E6E6E6"),
  },
});
