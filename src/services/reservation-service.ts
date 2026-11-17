import { apiFetch } from "@/lib/api";
import { supabase } from "@/lib/supabase";

export interface HarvestReservation {
  id: number;
  reservation_code: string;
  post_id: number;
  seller_id: number;
  buyer_id: number;
  crop_name: string;
  quantity: number | string;
  unit: string;
  price_per_unit: number | string;
  total_estimated_amount: number | string;
  actual_weighed_quantity: number | string | null;
  final_settled_amount: number | string | null;
  harvest_date: string;
  pickup_location: string;
  status: 'pending' | 'confirmed' | 'ready_for_pickup' | 'completed' | 'cancelled';
  qr_token: string;
  buyer_notes?: string | null;
  seller_notes?: string | null;
  weighed_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  buyer_name?: string;
  buyer_username?: string;
  buyer_email?: string;
  buyer_phone?: string;
  buyer_avatar?: string;
  seller_name?: string;
  seller_username?: string;
  seller_email?: string;
  seller_phone?: string;
  seller_avatar?: string;
  farm_name?: string;
  farmer_code?: string;
}

export interface CreateReservationParams {
  postId: number | string;
  quantity: number;
  buyerNotes?: string;
}

export interface VerifyPickupParams {
  qrToken?: string;
  reservationCode?: string;
  actualWeighedQuantity?: number;
  sellerNotes?: string;
}

// 1. Fetch user reservations (as buyer, seller, or both)
export async function getMyReservationsApi(
  role: 'buyer' | 'seller' | 'all' = 'all',
  status: string = 'all',
  postId?: string | number
): Promise<{ success: boolean; reservations: HarvestReservation[] }> {
  // 1. Try Supabase query
  try {
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user) {
      const uid = authData.user.id;
      let query = supabase
        .from('harvest_reservations')
        .select(`
          *,
          buyer:profiles!buyer_id(full_name, username, email, phone_number, avatar_url),
          seller:profiles!seller_id(full_name, username, email, phone_number, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (role === 'buyer') {
        query = query.eq('buyer_id', uid);
      } else if (role === 'seller') {
        query = query.eq('seller_id', uid);
      } else {
        query = query.or(`buyer_id.eq.${uid},seller_id.eq.${uid}`);
      }

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }
      if (postId) {
        query = query.eq('post_id', Number(postId));
      }

      const { data, error } = await query;
      if (!error && data) {
        const reservations: HarvestReservation[] = data.map((hr: any) => ({
          ...hr,
          buyer_name: hr.buyer?.full_name || 'Buyer',
          buyer_username: hr.buyer?.username || '',
          buyer_email: hr.buyer?.email || '',
          buyer_phone: hr.buyer?.phone_number || '',
          buyer_avatar: hr.buyer?.avatar_url || '',
          seller_name: hr.seller?.full_name || 'Farmer',
          seller_username: hr.seller?.username || '',
          seller_email: hr.seller?.email || '',
          seller_phone: hr.seller?.phone_number || '',
          seller_avatar: hr.seller?.avatar_url || '',
          farm_name: hr.crop_name ? `${hr.crop_name} Farm` : 'Local Farm',
        }));
        return { success: true, reservations };
      }
    }
  } catch (err) {
    console.warn("Supabase getMyReservationsApi warning:", err);
  }

  // 2. Fallback to API server
  try {
    const queryParams: Record<string, string> = { role, status };
    if (postId) {
      queryParams.postId = String(postId);
    }
    const query = new URLSearchParams(queryParams).toString();
    return await apiFetch<{ success: boolean; reservations: HarvestReservation[] }>(
      `/reservations/my-reservations?${query}`
    );
  } catch {
    return { success: true, reservations: [] };
  }
}

// 2. Create advance pre-harvest reservation
export async function createReservationApi(
  params: CreateReservationParams
): Promise<{ success: boolean; message: string; reservation: HarvestReservation }> {
  return apiFetch<{ success: boolean; message: string; reservation: HarvestReservation }>(
    `/reservations`,
    {
      method: 'POST',
      body: JSON.stringify(params),
    }
  );
}

// 3. Verify pickup & weigh-in
export async function verifyPickupApi(
  params: VerifyPickupParams
): Promise<{ success: boolean; message: string; receipt: HarvestReservation }> {
  return apiFetch<{ success: boolean; message: string; receipt: HarvestReservation }>(
    `/reservations/verify-pickup`,
    {
      method: 'POST',
      body: JSON.stringify(params),
    }
  );
}

// 4. Update reservation status
export async function updateReservationStatusApi(
  id: number | string,
  status: 'confirmed' | 'ready_for_pickup' | 'cancelled',
  sellerNotes?: string
): Promise<{ success: boolean; message: string; reservation: HarvestReservation }> {
  return apiFetch<{ success: boolean; message: string; reservation: HarvestReservation }>(
    `/reservations/${id}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status, sellerNotes }),
    }
  );
}
