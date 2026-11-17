import { apiFetch } from "@/lib/api";
import { supabase } from "@/lib/supabase";

export interface OriginalPostItem {
  id: string;
  userId: string;
  authorName: string;
  authorRole: string;
  avatarUri: string;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  timeAgo: string;
  content: string;
  imageUrl: string;
  images?: string[];
  category: string;
  isVerified?: boolean;
}

export interface TaggedUser {
  id: string;
  name: string;
  username?: string;
  avatarUrl?: string;
}

export interface PostItem {
  id: string;
  userId: string;
  authorName: string;
  authorRole: string;
  avatarUri: string;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  timeAgo: string;
  content: string;
  imageUrl: string;
  images?: string[];
  category: string;
  privacy: string;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  userReaction?: string | null;
  isSaved?: boolean;
  isShared?: boolean;
  isVerified?: boolean;
  originalPost?: OriginalPostItem | null;
  expiresAt?: number | string | null;
  durationLabel?: string;
  taggedUsers?: TaggedUser[];
  isPreHarvest?: boolean;
  expectedHarvestDate?: string | null;
  availableQuantity?: number | null;
  reservedQuantity?: number;
  cropName?: string | null;
  unit?: string;
  pricePerUnit?: number | null;
  pickupHub?: string | null;
}

export interface SavedPostItem extends PostItem {
  savedId: string;
  collectionName: string;
  savedAt: string;
}

export interface SavedCollectionDetail {
  name: string;
  itemCount: number;
  coverImageUrl?: string;
  hasCurrentPost?: boolean;
  isDefault?: boolean;
}

export interface CommentItem {
  id: string;
  postId: string;
  userId: string;
  authorName: string;
  avatarUri?: string;
  timeAgo: string;
  content: string;
  likes: number;
  isLiked: boolean;
  isVerified?: boolean;
  parentId?: string | null;
}

export interface CreatePostPayload {
  content: string;
  category?: string;
  privacy?: string;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  photos?: string[];
  images?: string[];
  imageUrl?: string;
  taggedUserIds?: string[];
  expiresAt?: number | string | null;
  temporaryDuration?: number;
  durationLabel?: string;
  viewerCount?: number;
  durationSeconds?: number;
  isLiveReplay?: boolean;
}

function mapSupabasePost(p: any): PostItem {
  const profile = p.profiles || {};
  return {
    id: String(p.id),
    userId: String(p.user_id),
    authorName: profile.full_name || profile.username || 'Local Farmer',
    authorRole: profile.role || 'farmer',
    avatarUri: profile.avatar_url || '',
    location: p.location || profile.location || 'Iligan City, Philippines',
    latitude: p.latitude,
    longitude: p.longitude,
    timeAgo: p.created_at ? new Date(p.created_at).toLocaleDateString() : 'Just now',
    content: p.content,
    imageUrl: p.image_url || '',
    images: Array.isArray(p.images) ? p.images : Array.isArray(p.photos) ? p.photos : [],
    category: p.category || 'General',
    privacy: p.privacy || 'Public',
    likes: Number(p.likes_count) || 0,
    comments: Number(p.comments_count) || 0,
    shares: Number(p.shares_count) || 0,
    isLiked: false,
    cropName: p.crop_name,
    unit: p.unit || 'kg',
    pricePerUnit: p.price_per_unit,
    availableQuantity: p.available_quantity,
    reservedQuantity: p.reserved_quantity || 0,
    isPreHarvest: Boolean(p.is_pre_harvest),
    expectedHarvestDate: p.expected_harvest_date,
    pickupHub: p.pickup_hub,
  };
}

export async function getPostsApi(
  category?: string,
  userId?: string | number,
  search?: string
): Promise<PostItem[]> {
  // 1. Try Supabase direct query first
  try {
    let query = supabase
      .from('posts')
      .select('*, profiles!user_id(full_name, username, role, avatar_url, location)')
      .order('created_at', { ascending: false });

    if (category && category !== "All") {
      query = query.eq('category', category);
    }
    if (userId) {
      query = query.eq('user_id', String(userId));
    }
    if (search && search.trim()) {
      query = query.or(`content.ilike.%${search.trim()}%,crop_name.ilike.%${search.trim()}%,location.ilike.%${search.trim()}%`);
    }

    const { data, error } = await query;
    if (!error && data) {
      return data.map(mapSupabasePost);
    }
  } catch (err) {
    console.warn("Supabase getPostsApi warning:", err);
  }

  // 2. Fallback to API server if Express backend is running
  try {
    const queryParts: string[] = [];
    if (category && category !== "All") {
      queryParts.push(`category=${encodeURIComponent(category)}`);
    }
    if (userId) {
      queryParts.push(`userId=${encodeURIComponent(String(userId))}`);
    }
    if (search && search.trim()) {
      queryParts.push(`search=${encodeURIComponent(search.trim())}`);
    }
    const query = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
    const res = await apiFetch<{ posts: PostItem[]; count: number }>(`/posts${query}`);
    return res.posts || [];
  } catch {
    return [];
  }
}

export async function createPostApi(payload: CreatePostPayload): Promise<PostItem> {
  // 1. Try Supabase create post
  try {
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user) {
      const { data: newPost, error } = await supabase
        .from('posts')
        .insert({
          user_id: authData.user.id,
          content: payload.content,
          category: payload.category || 'General',
          privacy: payload.privacy || 'Public',
          location: payload.location || 'Iligan City, Philippines',
          latitude: payload.latitude || null,
          longitude: payload.longitude || null,
          image_url: payload.imageUrl || (payload.photos && payload.photos[0]) || (payload.images && payload.images[0]) || null,
          photos: payload.photos || [],
          images: payload.images || [],
        })
        .select('*, profiles!user_id(full_name, username, role, avatar_url, location)')
        .single();

      if (!error && newPost) {
        return mapSupabasePost(newPost);
      }
    }
  } catch (err) {
    console.warn("Supabase createPostApi warning:", err);
  }

  // 2. Fallback to API server
  const res = await apiFetch<{ message: string; post: PostItem }>("/posts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.post;
}

export async function recordLiveStreamApi(payload: {
  viewerCount?: number;
  durationSeconds?: number;
  status?: string;
  postId?: number | string | null;
}): Promise<{ message: string; liveStream: any }> {
  return await apiFetch<{ message: string; liveStream: any }>("/live-streams", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function toggleLikePostApi(
  postId: string,
  reactionType?: string,
): Promise<{ isLiked: boolean; likesCount: number; userReaction?: string | null }> {
  return await apiFetch<{ isLiked: boolean; likesCount: number; userReaction?: string | null }>(
    `/posts/${postId}/like`,
    {
      method: "POST",
      body: JSON.stringify({ reactionType }),
    },
  );
}

export async function getPostCommentsApi(postId: string): Promise<CommentItem[]> {
  const res = await apiFetch<{ comments: CommentItem[]; count: number }>(`/posts/${postId}/comments`);
  return res.comments || [];
}

export async function addPostCommentApi(
  postId: string,
  content: string,
  parentId?: string | null
): Promise<CommentItem> {
  const res = await apiFetch<{ message: string; comment: CommentItem }>(`/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({ content, parentId }),
  });
  return res.comment;
}

export async function toggleLikeCommentApi(commentId: string): Promise<{ isLiked: boolean; likesCount: number }> {
  return await apiFetch<{ isLiked: boolean; likesCount: number }>(`/comments/${commentId}/like`, {
    method: "POST",
  });
}

export async function sharePostApi(
  postId: string,
  shareType: string = "public",
  caption?: string,
  groupName?: string,
  privacy?: string
): Promise<{ message: string; sharesCount: number; sharedPost?: PostItem | null }> {
  return await apiFetch<{ message: string; sharesCount: number; sharedPost?: PostItem | null }>(`/posts/${postId}/share`, {
    method: "POST",
    body: JSON.stringify({ shareType, caption, groupName, privacy }),
  });
}

export async function getPostByIdApi(postId: string): Promise<PostItem> {
  const res = await apiFetch<{ post: PostItem }>(`/posts/${postId}`);
  return res.post;
}

export async function updatePostApi(
  postId: string,
  data: {
    content?: string;
    category?: string;
    privacy?: string;
    location?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    imageUrl?: string | null;
    photos?: string[];
    expiresAt?: number | null;
    durationLabel?: string;
  }
): Promise<{
  message: string;
  post: {
    id: string;
    content: string;
    category: string;
    privacy: string;
    location?: string;
    latitude?: number | null;
    longitude?: number | null;
    imageUrl?: string;
  };
}> {
  return await apiFetch<{
    message: string;
    post: {
      id: string;
      content: string;
      category: string;
      privacy: string;
      location?: string;
      latitude?: number | null;
      longitude?: number | null;
      imageUrl?: string;
    };
  }>(`/posts/${postId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deletePostApi(postId: string): Promise<{ message: string }> {
  return await apiFetch<{ message: string }>(`/posts/${postId}`, {
    method: "DELETE",
  });
}

export async function getSavedPostsApi(): Promise<SavedPostItem[]> {
  const res = await apiFetch<{ savedPosts: SavedPostItem[]; count: number }>("/posts/saved");
  return res.savedPosts || [];
}

export async function getSavedCollectionsApi(): Promise<string[]> {
  const res = await apiFetch<{ collections: string[] }>("/posts/saved/collections");
  return res.collections || ["All Saved"];
}

export async function toggleSavePostApi(
  postId: string,
  collectionName?: string
): Promise<{ message: string; isSaved: boolean; collectionName?: string | null }> {
  return await apiFetch<{ message: string; isSaved: boolean; collectionName?: string | null }>(
    `/posts/${postId}/save`,
    {
      method: "POST",
      body: JSON.stringify({ collectionName }),
    }
  );
}

export async function getSavedCollectionDetailsApi(
  postId?: string
): Promise<SavedCollectionDetail[]> {
  const query = postId ? `?postId=${encodeURIComponent(postId)}` : "";
  const res = await apiFetch<{ collections: SavedCollectionDetail[] }>(
    `/posts/saved/collections/details${query}`
  );
  return res.collections || [];
}

export async function createSavedCollectionApi(
  name: string,
  postId?: string
): Promise<{ message: string; collection?: SavedCollectionDetail }> {
  return await apiFetch<{ message: string; collection?: SavedCollectionDetail }>(
    "/posts/saved/collections",
    {
      method: "POST",
      body: JSON.stringify({ name, postId }),
    }
  );
}

export async function renameSavedCollectionApi(
  oldName: string,
  newName: string
): Promise<{ message: string }> {
  return await apiFetch<{ message: string }>("/posts/saved/collections/rename", {
    method: "PATCH",
    body: JSON.stringify({ oldName, newName }),
  });
}

export async function deleteSavedCollectionApi(
  name: string
): Promise<{ message: string }> {
  return await apiFetch<{ message: string }>(
    `/posts/saved/collections/${encodeURIComponent(name)}`,
    {
      method: "DELETE",
    }
  );
}

