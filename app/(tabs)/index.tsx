import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, TextInput, Dimensions, BackHandler, ToastAndroid, Platform } from 'react-native';
import { Image } from 'expo-image';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useRouter, useFocusEffect } from 'expo-router';
import API_URL from '../../constants/Config';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useScrollToTop } from '@react-navigation/native';

const { width } = Dimensions.get('window');

interface Book {
  id: number;
  title: string;
  author: string;
  price: number;
  is_free: boolean;
  cover_image?: string;
  average_rating?: number;
  category?: string;
  is_bookmarked?: boolean;
}

interface CurrentReading {
  book: Book;
  progress: number;
  last_read_at: string;
}

// Category icon mapping
const CATEGORY_ICONS: Record<string, string> = {
  'Fiction': 'book',
  'Self-Help': 'bulb',
  'Sci-Fi': 'planet',
  'History': 'time',
  'Romance': 'heart',
  'Romantic': 'heart',
  'Psychology': 'brain',
  'Technology': 'hardware-chip',
  'Business': 'briefcase',
  'Horror': 'skull',
  'Fantasy': 'sparkles',
  'Mystery': 'search',
  'Biography': 'person',
  'Education': 'school',
};

const CATEGORY_COLORS: string[] = [
  '#2D3250', '#F5A623', '#E76F51', '#2A9D8F', '#E63946',
  '#457B9D', '#6D6875', '#B5838D', '#264653', '#E9C46A',
];

function getCategoryIcon(cat: string): string {
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (cat.toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return 'library';
}

export default function HomeScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  const [books, setBooks] = useState<Book[]>([]);
  const [currentReading, setCurrentReading] = useState<CurrentReading | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [favoriteCategories, setFavoriteCategories] = useState<string[]>([]);
  const [youMayLikeCategory, setYouMayLikeCategory] = useState<string | null>(null);
  const [graduatedCategories, setGraduatedCategories] = useState<string[]>([]);
  const [userName, setUserName] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAll();
  }, []);

  const lastBackPress = useRef(0);

  // Prevent back button from going back to login screen, close app on double tap instead (Only when focused)
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
          const timeNow = new Date().getTime();
          
          if (timeNow - lastBackPress.current < 2000) {
              // Second press within 2 seconds: close app natively
              BackHandler.exitApp();
          } else {
              // First press: warn user
              lastBackPress.current = timeNow;
              if (Platform.OS === 'android') {
                  ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
              }
          }
          return true; // prevent default (navigation pop)
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => backHandler.remove();
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const fetchUnreadCount = async () => {
        try {
          const token = await SecureStore.getItemAsync('access_token');
          if (token) {
            const res = await axios.get(`${API_URL}/notifications/`, { headers: { Authorization: `Bearer ${token}` } });
            if (isActive && res.data) {
               const unread = res.data.filter((n: any) => !n.is_read).length;
               setUnreadCount(unread);
            }
          }
        } catch (e) {}
      };
      fetchUnreadCount();
      return () => { isActive = false; };
    }, [])
  );

  const fetchAll = async () => {
    try {
      const token = await SecureStore.getItemAsync('access_token');
      if (!token) { router.replace('/login'); return; }

      const headers = { Authorization: `Bearer ${token}` };

      const [booksRes, readingRes, catsRes, meRes, progressRes, notifRes] = await Promise.all([
        axios.get(`${API_URL}/books/`, { headers }),
        axios.get(`${API_URL}/books/current/reading`, { headers }).catch(() => ({ data: null })),
        axios.get(`${API_URL}/books/categories`, { headers }),
        axios.get(`${API_URL}/auth/me`, { headers }).catch(() => ({ data: {} })),
        axios.get(`${API_URL}/books/progress`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/notifications/`, { headers }).catch(() => ({ data: [] }))
      ]);

      setBooks(booksRes.data);
      if (readingRes.data) setCurrentReading(readingRes.data);
      setCategories(catsRes.data || []);
      setUserName(meRes.data?.name || '');

      const unread = (notifRes.data || []).filter((n: any) => !n.is_read).length;
      setUnreadCount(unread);

      let favs: string[] = [];
      const favsStr = await SecureStore.getItemAsync('favorite_categories');
      if (favsStr) {
        try {
          favs = JSON.parse(favsStr);
          setFavoriteCategories(favs);
        } catch(e) {}
      }

      let pg: string[] = [];
      const pgStr = await SecureStore.getItemAsync('persisted_graduates');
      if (pgStr) {
        try {
            pg = JSON.parse(pgStr);
        } catch(e) {}
      }

      // Compute "You May Like" and Graduated categories
      if (progressRes.data && progressRes.data.length > 0) {
          // Filter to items >= 50% progress
          const validProgress = progressRes.data.filter((p: any) => p.progress >= 50);

          // Determine latest read time per category
          const catTimeMap = new Map<string, number>();
          validProgress.forEach((p: any) => {
              if (p.category && (!favs.length || !favs.includes(p.category))) {
                  const time = new Date(p.last_read_at).getTime();
                  if (!catTimeMap.has(p.category) || time > catTimeMap.get(p.category)!) {
                      catTimeMap.set(p.category, time);
                  }
              }
          });

          // Sort by time descending
          const sortedCats = Array.from(catTimeMap.entries())
              .sort((a, b) => b[1] - a[1])
              .map(entry => entry[0]);

          if (sortedCats.length > 0) {
              // Find the first category that has NOT already graduated
              let chosenYML = sortedCats.find(c => !pg.includes(c));

              if (chosenYML) {
                  setYouMayLikeCategory(chosenYML);
                  // The rest of the valid categories graduate
                  const newGraduates = sortedCats.filter(c => c !== chosenYML);

                  // Combine new graduates with existing ones and persist
                  const combinedGraduates = Array.from(new Set([...pg, ...newGraduates]));
                  setGraduatedCategories(combinedGraduates);

                  if (combinedGraduates.length > pg.length) {
                      SecureStore.setItemAsync('persisted_graduates', JSON.stringify(combinedGraduates)).catch(()=>{});
                  }
              } else {
                  // All of them have already graduated, so there is no "You May Like"
                  setYouMayLikeCategory(null);
                  setGraduatedCategories(sortedCats);
              }

          } else {
              setYouMayLikeCategory(null);
              setGraduatedCategories([]);
          }
      }

    } catch (error: any) {
      console.log('Error fetching data', error);
      if (error.response?.status === 401) router.replace('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleBookmark = async (bookId: number) => {
    try {
      const token = await SecureStore.getItemAsync('access_token');
      await axios.post(`${API_URL}/books/${bookId}/bookmark`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) {
      console.log('Bookmark error', e);
    }
  };

  const filteredBooks = searchQuery.trim()
    ? books.filter(b =>
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.category || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
    : books.filter(b => (b.average_rating || 0) >= 3.0);

  const renderBookCard = ({ item }: { item: Book }) => (
    <TouchableOpacity
      style={styles.bookCard}
      onPress={() => router.push({ pathname: '/book/[id]', params: { id: item.id } })}
      activeOpacity={0.85}
    >
      <View style={styles.bookCover}>
        {item.cover_image ? (
          <Image source={{ uri: `${API_URL}${item.cover_image}` }} style={styles.coverImage} contentFit="cover" transition={200} cachePolicy="memory-disk" />
        ) : (
          <View style={[styles.coverPlaceholder, { backgroundColor: '#264653' }]}>
            <Text style={styles.coverTitle}>{item.title.substring(0, 12)}</Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.bookmarkIcon}
          onPress={() => {
            handleBookmark(item.id);
            // Optimistic update
            setBooks(prev => prev.map(b =>
              b.id === item.id ? { ...b, is_bookmarked: !b.is_bookmarked } : b
            ));
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={item.is_bookmarked ? "bookmark" : "bookmark-outline"}
            size={16}
            color={item.is_bookmarked ? "#F5A623" : "#2D3250"}
          />
        </TouchableOpacity>
      </View>
      <Text style={styles.bookListTitle} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.bookListAuthor} numberOfLines={1}>{item.author}</Text>
      {item.average_rating ? (
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={12} color="#F5A623" />
          <Text style={styles.ratingText}>{item.average_rating}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );

  if (loading) return (
    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color="#2D3250" />
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} bounces={false}>

        {/* Header with Greeting */}
        <View style={styles.headerSection}>
          <View style={styles.headerShapeBg} />
          <View style={styles.headerCircle} />
          <SafeAreaView edges={['top']} style={styles.headerContent}>
            <View style={styles.greetingRow}>
              <View>
                <Text style={styles.greetingText}>Hello, {userName || 'Reader'}!</Text>
                <Text style={styles.greetingSub}>Ready to dive in?</Text>
              </View>
              <TouchableOpacity style={styles.bellButton} onPress={() => router.push('/notifications')}>
                <Ionicons name="notifications" size={22} color="#F5A623" />
                {unreadCount > 0 && (
                  <View style={{
                    position: 'absolute', top: -4, right: -4, backgroundColor: '#E74C3C',
                    borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center',
                    paddingHorizontal: 4, borderWidth: 1.5, borderColor: '#FFF'
                  }}>
                    <Text style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold' }}>
                      {unreadCount > 5 ? '5+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#999" />
              <TextInput
                placeholder="Search books, authors, genres..."
                placeholderTextColor="#999"
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </SafeAreaView>
        </View>

        <View style={styles.bodyContent}>
          {searchQuery.trim() ? (
            /* Vertical Search Results */
            <View style={{ paddingHorizontal: 20, paddingBottom: 100 }}>
              <Text style={[styles.sectionTitle, { marginLeft: -20, marginBottom: 20 }]}>Search Results</Text>
              {filteredBooks.length > 0 ? (
                <View style={styles.searchGrid}>
                  {filteredBooks.map((item) => (
                    <TouchableOpacity
                      key={`search-${item.id}`}
                      style={styles.searchCard}
                      onPress={() => router.push({ pathname: '/book/[id]', params: { id: item.id } })}
                    >
                      <Image
                        source={{ uri: item.cover_image ? `${API_URL}${item.cover_image}` : 'https://via.placeholder.com/150' }}
                        style={styles.searchCover}
                        contentFit="cover"
                        transition={200}
                        cachePolicy="memory-disk"
                      />
                      <View style={styles.searchInfo}>
                        <Text style={styles.searchTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.searchAuthor} numberOfLines={1}>{item.author}</Text>
                        <View style={styles.ratingRow}>
                          <Ionicons name="star" size={12} color="#F5A623" />
                          <Text style={styles.ratingText}>{item.average_rating || '0.0'}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>No books found for "{searchQuery}"</Text>
                </View>
              )}
            </View>
          ) : (
            <>
              {/* Continue Reading Section */}
              {currentReading && currentReading.book && (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Continue Reading</Text>
                    <TouchableOpacity onPress={() => router.push('/(tabs)/library')}>
                      <Text style={styles.seeAll}>See All</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.continueCard}
                    onPress={() => router.push({ pathname: '/book/[id]', params: { id: currentReading.book.id } })}
                    activeOpacity={0.9}
                  >
                    <View style={styles.continueImageWrap}>
                      {currentReading.book.cover_image ? (
                        <Image
                          source={{ uri: `${API_URL}${currentReading.book.cover_image}` }}
                          style={styles.continueCover}
                          contentFit="cover"
                          transition={200}
                          cachePolicy="memory-disk"
                        />
                      ) : (
                        <View style={[styles.continueCover, { backgroundColor: '#E76F51', justifyContent: 'center', alignItems: 'center' }]}>
                          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>{currentReading.book.title}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.continueInfo}>
                      {currentReading.book.category ? (
                        <Text style={styles.categoryTag}>{currentReading.book.category.toUpperCase()}</Text>
                      ) : null}
                      <Text style={styles.continueTitle} numberOfLines={2}>{currentReading.book.title}</Text>
                      <Text style={styles.continueAuthor}>{currentReading.book.author}</Text>
                      <View style={styles.progressRow}>
                        <View style={styles.progressBarBg}>
                          <View style={[styles.progressBarFill, { width: `${Math.min(currentReading.progress, 100)}%` }]} />
                        </View>
                        <Text style={styles.progressPercent}>{Math.round(currentReading.progress)}%</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </>
              )}

              {/* Categories Grid/Shortcuts */}
              {categories.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Explore Genres</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesRow}>
                    {categories.map((cat, idx) => (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.categoryPill, { backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }]}
                        onPress={() => router.push(`/category/${cat}`)}
                      >
                        <Text style={styles.categoryPillText}>{cat}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              {/* Recommended / Top Rated Books */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recommended</Text>
              </View>

              <FlatList
                horizontal
                data={filteredBooks}
                keyExtractor={(item) => `rec-${item.id}`}
                renderItem={renderBookCard}
                contentContainerStyle={styles.bookList}
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={width * 0.42 + 15}
                snapToAlignment="start"
              />

              {/* You May Like section */}
              {youMayLikeCategory && (
                  <View>
                      <View style={styles.sectionHeader}>
                          <Text style={styles.sectionTitle}>You may like books..</Text>
                      </View>
                      <FlatList
                          horizontal
                          data={books.filter(b => b.category === youMayLikeCategory).slice(0, 5)}
                          keyExtractor={(item) => `yml-${item.id}`}
                          renderItem={renderBookCard}
                          contentContainerStyle={styles.bookList}
                          showsHorizontalScrollIndicator={false}
                          decelerationRate="fast"
                          snapToInterval={width * 0.42 + 15}
                          snapToAlignment="start"
                      />
                  </View>
              )}

              {/* Category-wise Book Lists */}
              {categories.map((cat) => {
                const isFavorite = favoriteCategories.length === 0 || favoriteCategories.includes(cat);
                const isGraduated = graduatedCategories.includes(cat);
                
                if (!isFavorite && !isGraduated) {
                  return null;
                }

                const booksInCat = books.filter(b => b.category === cat);
                if (booksInCat.length === 0) return null;

                return (
                  <View key={`cat-section-${cat}`}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>{cat}</Text>
                    </View>

                    <FlatList
                      horizontal
                      data={booksInCat.slice(0, 3)}
                      keyExtractor={(item) => `cat-${cat}-${item.id}`}
                      renderItem={renderBookCard}
                      contentContainerStyle={styles.bookList}
                      showsHorizontalScrollIndicator={false}
                      decelerationRate="fast"
                      snapToInterval={width * 0.42 + 15}
                      snapToAlignment="start"
                      ListFooterComponent={() =>
                        booksInCat.length > 3 ? (
                          <View style={styles.listFooter}>
                            <TouchableOpacity
                              style={styles.arrowButton}
                              onPress={() => router.push(`/category/${cat}`)}
                            >
                              <Ionicons name="arrow-forward" size={24} color="#FFF" />
                            </TouchableOpacity>
                          </View>
                        ) : null
                      }
                    />
                  </View>
                );
              })}
            </>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFBF0',
  },

  // --- Header ---
  headerSection: {
    position: 'relative',
    paddingBottom: 25,
    overflow: 'hidden',
  },
  headerShapeBg: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 200,
    backgroundColor: '#2D3250',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerCircle: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#F5A623',
    opacity: 0.6,
  },
  headerContent: {
    zIndex: 2,
  },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
    paddingHorizontal: 24,
  },
  greetingText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFF',
    fontFamily: 'serif',
  },
  greetingSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#333',
  },

  // --- Body ---
  bodyContent: {
    paddingTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#2D3250',
    fontFamily: 'serif',
    paddingHorizontal: 20,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F5A623',
  },

  // --- Continue Reading ---
  continueCard: {
    backgroundColor: '#EAE0D5',
    padding: 16,
    flexDirection: 'row',
    marginBottom: 10,
  },
  continueImageWrap: {
    width: 70,
    marginRight: 14,
  },
  continueCover: {
    width: 70,
    height: 100,
    borderRadius: 10,
    backgroundColor: '#333',
  },
  continueInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  categoryTag: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F5A623',
    letterSpacing: 1,
    marginBottom: 4,
  },
  continueTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#2D3250',
    fontFamily: 'serif',
    marginBottom: 3,
  },
  continueAuthor: {
    fontSize: 13,
    color: '#666',
    marginBottom: 10,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: '#D6C6B9',
    borderRadius: 3,
    marginRight: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2D3250',
    borderRadius: 3,
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2D3250',
  },

  // --- Categories ---
  categoriesRow: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    gap: 12,
  },
  categoryPill: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryPillText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },

  // --- Book Cards ---
  bookList: {
    paddingBottom: 10,
    paddingHorizontal: 20,
  },
  bookCard: {
    width: width * 0.42,
    marginRight: 15,
  },
  bookCover: {
    width: '100%',
    height: (width * 0.42) * 1.35,
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#f0f0f0',
  },
  coverPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverTitle: {
    color: '#EEE',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  bookmarkIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookListTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2D3250',
    fontFamily: 'serif',
  },
  bookListAuthor: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2D3250',
  },
  // --- Search Results ---
  searchGrid: {
    flexDirection: 'column',
    gap: 15,
  },
  searchCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    marginHorizontal: 0,
    marginBottom: 0,
  },
  searchCover: {
    width: 60,
    height: 90,
    borderRadius: 8,
    marginRight: 15,
  },
  searchInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  searchTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3250',
    fontFamily: 'serif',
  },
  searchAuthor: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  empty: {
    marginTop: 50,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
  },
  listFooter: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: 20,
    height: (width * 0.42) * 1.35, // match book cover height
  },
  arrowButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F5A623',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F5A623',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
});
