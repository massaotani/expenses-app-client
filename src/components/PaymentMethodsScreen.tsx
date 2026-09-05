import { moderateScale, scale, verticalScale } from "@/utils/scaling";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "../constants/theme";
import api from "../services/api";

export interface UserCard {
  id: string;
  name: string;
  cardType: "CREDIT" | "DEBIT";
}

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  const [cards, setCards] = useState<UserCard[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal State
  const modalRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["65%"], []);
  const [modalMode, setModalMode] = useState<"ADD" | "EDIT">("ADD");
  const [selectedCardForAction, setSelectedCardForAction] =
    useState<UserCard | null>(null);

  // Form Fields
  const [cardName, setCardName] = useState("");
  const [cardType, setCardType] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [submittingCard, setSubmittingCard] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dx > 30 && Math.abs(gestureState.dy) < 30;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 80) {
          router.replace("/settings");
        }
      },
    }),
  ).current;

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      setLoading(true);
      const res = await api.get<UserCard[]>("/api/v1/cards");
      const fetchedCards = res.data || [];
      setCards(fetchedCards);
    } catch (error) {
      if (__DEV__) {
        console.error("Error fetching cards:", error);
      }
      Alert.alert(
        t("error", "Error"),
        t("failedToFetchCards", "Failed to fetch registered cards."),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setModalMode("ADD");
    setSelectedCardForAction(null);
    setCardName("");
    setCardType("CREDIT");
    modalRef.current?.present();
  };

  const handleOpenEditModal = (card: UserCard) => {
    setModalMode("EDIT");
    setSelectedCardForAction(card);
    setCardName(card.name);
    setCardType(card.cardType);
    modalRef.current?.present();
  };

  const handleSaveCard = async () => {
    if (!cardName.trim()) {
      Alert.alert(
        t("error", "Error"),
        t("enterCardName", "Please enter a card name."),
      );
      return;
    }

    setSubmittingCard(true);
    try {
      if (modalMode === "ADD") {
        const res = await api.post<UserCard>("/api/v1/cards", {
          name: cardName.trim(),
          cardType,
        });
        setCards((prev) => [...prev, res.data]);
      } else if (modalMode === "EDIT" && selectedCardForAction) {
        await api.put(`/api/v1/cards/${selectedCardForAction.id}`, {
          name: cardName.trim(),
          cardType,
        });
        setCards((prev) =>
          prev.map((item) =>
            item.id === selectedCardForAction.id
              ? { ...item, name: cardName.trim(), cardType }
              : item,
          ),
        );
      }
      modalRef.current?.dismiss();
      clearFields();
    } catch (error: any) {
      if (__DEV__) {
        console.error("Error saving card:", error);
      }
      Alert.alert(
        t("error", "Error"),
        error?.response?.data?.message ||
          t("failedToSaveCard", "Failed to save card details."),
      );
    } finally {
      setSubmittingCard(false);
    }
  };

  const handleDeleteCard = (card: UserCard) => {
    Alert.alert(
      t("delete", "Delete"),
      t("deleteCardConfirmation", "Are you sure you want to delete this card?"),
      [
        { text: t("cancel", "Cancel"), style: "cancel" },
        {
          text: t("delete", "Delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/api/v1/cards/${card.id}`);
              setCards((prev) => prev.filter((item) => item.id !== card.id));
            } catch (error: any) {
              Alert.alert(
                t("error", "Error"),
                error?.response?.data?.message ||
                  t("failedToDeleteCard", "Failed to delete card."),
              );
            }
          },
        },
      ],
    );
  };

  const clearFields = () => {
    setCardName("");
    setCardType("CREDIT");
    setSelectedCardForAction(null);
  };

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
      />
    ),
    [],
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.headerBackground }]}
      edges={["top"]}
      {...panResponder.panHandlers}
    >
      <StatusBar
        barStyle={colors.statusBarStyle}
        backgroundColor={colors.headerBackground}
      />

      {/* HEADER */}
      <View
        style={[styles.header, { backgroundColor: colors.headerBackground }]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push("/settings")}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t("paymentMethods", "Payment Methods")}
        </Text>
      </View>

      {/* BODY */}
      <View
        style={[
          styles.bodyContainer,
          { backgroundColor: colors.screenBackground },
        ]}
      >
        <View style={styles.content}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t("savedMethods", "SAVED METHODS")}
          </Text>

          {/* SCROLLABLE SAVED METHODS CARD CONTAINER */}
          <View
            style={[styles.card, { backgroundColor: colors.cardBackground }]}
          >
            {loading ? (
              <ActivityIndicator
                style={{ paddingVertical: 20 }}
                color={colors.primaryTeal}
              />
            ) : cards.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t("noCardsRegistered", "No cards registered")}
              </Text>
            ) : (
              <ScrollView
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={false}
              >
                {cards.map((item, index) => (
                  <React.Fragment key={item.id}>
                    {index > 0 && (
                      <View
                        style={[
                          styles.divider,
                          { backgroundColor: colors.divider },
                        ]}
                      />
                    )}
                    <View style={styles.row}>
                      <View style={styles.rowLeft}>
                        <View
                          style={[
                            styles.iconBox,
                            { backgroundColor: colors.iconBoxBg },
                          ]}
                        >
                          <Ionicons
                            name="card-outline"
                            size={20}
                            color={colors.textPrimary}
                          />
                        </View>

                        <View style={styles.methodInfo}>
                          <Text
                            style={[
                              styles.methodTitle,
                              { color: colors.textPrimary },
                            ]}
                          >
                            {item.name}
                          </Text>
                          <Text
                            style={[
                              styles.methodSubtitle,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {item.cardType === "DEBIT"
                              ? t("debit", "Debit")
                              : t("credit", "Credit")}
                          </Text>
                        </View>
                      </View>

                      {/* ACTION BUTTONS (EDIT & DELETE) */}
                      <View style={styles.actionButtonsContainer}>
                        <TouchableOpacity
                          style={styles.actionIconButton}
                          onPress={() => handleOpenEditModal(item)}
                        >
                          <Ionicons
                            name="pencil-outline"
                            size={18}
                            color={colors.textSecondary}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionIconButton}
                          onPress={() => handleDeleteCard(item)}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={18}
                            color="#EF4444"
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </React.Fragment>
                ))}
              </ScrollView>
            )}
          </View>

          {/* ADD METHOD BUTTON */}
          <TouchableOpacity
            style={[styles.addButton, { borderColor: colors.primaryTeal }]}
            onPress={handleOpenAddModal}
          >
            <Ionicons name="add" size={20} color={colors.primaryTeal} />
            <Text style={[styles.addButtonText, { color: colors.primaryTeal }]}>
              {t("addPaymentMethod", "Add Payment Method")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ADD / EDIT CARD BOTTOM SHEET */}
      <BottomSheetModal
        ref={modalRef}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        onDismiss={clearFields}
        backgroundStyle={{ backgroundColor: colors.cardBackground }}
        handleIndicatorStyle={{ backgroundColor: colors.textSecondary }}
      >
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
          <Pressable style={{ flex: 1 }} onPress={() => Keyboard.dismiss()}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {modalMode === "EDIT"
                ? `${t("edit", "Edit")} ${t("card", "Card")}`
                : t("addCard", "Add New Card")}
            </Text>

            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t("cardName", "Card Name")}
            </Text>
            <BottomSheetTextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.iconBoxBg,
                  color: colors.textPrimary,
                  borderColor: colors.divider,
                },
              ]}
              placeholder="e.g. Chase Sapphire, Nubank"
              placeholderTextColor={colors.textSecondary}
              value={cardName}
              onChangeText={setCardName}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t("cardType", "Card Type")}
            </Text>
            <View style={styles.twoColumnContainer}>
              {(["CREDIT", "DEBIT"] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.categoryChipTwoCol,
                    { backgroundColor: colors.iconBoxBg },
                    cardType === type && {
                      backgroundColor: colors.primaryTeal,
                    },
                  ]}
                  onPress={() => setCardType(type)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      { color: colors.textPrimary },
                      cardType === type && styles.categoryChipTextSelected,
                    ]}
                  >
                    {String(
                      t(type.toLowerCase(), {
                        defaultValue: type === "CREDIT" ? "Credit" : "Debit",
                      }),
                    )}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.saveButton,
                { backgroundColor: colors.primaryTeal },
              ]}
              onPress={handleSaveCard}
              disabled={submittingCard}
            >
              {submittingCard ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {modalMode === "EDIT"
                    ? t("updateCard", "Update Card")
                    : t("addCard", "Add Card")}
                </Text>
              )}
            </TouchableOpacity>
          </Pressable>
        </BottomSheetScrollView>
      </BottomSheetModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(12),
    paddingBottom: verticalScale(20),
  },
  backButton: { marginRight: scale(12) },
  headerTitle: {
    fontSize: moderateScale(22),
    fontWeight: "bold",
    color: "#FFFFFF",
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
  },
  bodyContainer: {
    flex: 1,
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    overflow: "hidden",
  },
  content: { padding: scale(20), flex: 1 },
  sectionTitle: {
    fontSize: moderateScale(12),
    fontWeight: "700",
    letterSpacing: scale(1.2),
    marginBottom: verticalScale(10),
    marginLeft: scale(4),
  },
  card: {
    borderRadius: scale(20),
    paddingHorizontal: scale(16),
    maxHeight: verticalScale(480),
    overflow: "hidden",
  },
  emptyText: {
    textAlign: "center",
    paddingVertical: verticalScale(20),
    fontSize: moderateScale(14),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: verticalScale(14),
  },
  rowLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  iconBox: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(12),
    justifyContent: "center",
    alignItems: "center",
    marginRight: scale(14),
  },
  methodInfo: { flex: 1 },
  methodTitle: { fontSize: moderateScale(16), fontWeight: "600" },
  methodSubtitle: { fontSize: moderateScale(13), marginTop: verticalScale(2) },
  actionButtonsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
  },
  actionIconButton: {
    padding: scale(6),
  },
  divider: { height: 1, marginLeft: scale(52) },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: scale(14),
    height: verticalScale(48),
    marginTop: verticalScale(20),
  },
  addButtonText: {
    fontSize: moderateScale(15),
    fontWeight: "600",
    marginLeft: scale(6),
  },
  sheetContent: { padding: scale(24), paddingBottom: verticalScale(40) },
  modalTitle: {
    fontSize: moderateScale(20),
    fontWeight: "bold",
    marginBottom: verticalScale(12),
  },
  label: {
    fontSize: moderateScale(13),
    fontWeight: "600",
    marginBottom: verticalScale(6),
    marginTop: verticalScale(10),
  },
  input: {
    height: verticalScale(48),
    borderRadius: scale(12),
    borderWidth: 1,
    paddingHorizontal: scale(16),
    fontSize: moderateScale(15),
  },
  twoColumnContainer: {
    flexDirection: "row",
    gap: scale(12),
    marginVertical: verticalScale(8),
  },
  categoryChipTwoCol: {
    flex: 1,
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
    borderRadius: scale(10),
    alignItems: "center",
    justifyContent: "center",
  },
  categoryChipText: {
    fontSize: moderateScale(13),
    fontWeight: "600",
  },
  categoryChipTextSelected: {
    color: "#FFFFFF",
  },
  saveButton: {
    height: verticalScale(42),
    borderRadius: scale(14),
    justifyContent: "center",
    alignItems: "center",
    marginTop: verticalScale(20),
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: moderateScale(16),
    fontWeight: "bold",
  },
});
