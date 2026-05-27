import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { apiFetch } from '../api';
import EmptyState from './common/EmptyState';
import Alert from './common/Alert';
import MediaPreview from './common/MediaPreview';
import MasonryGrid from './common/MasonryGrid';
import ProfilePostCard from './ProfilePostCard';
import '../../css/app.css';

function Profile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const toast = useToast().toast;
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [error, setError] = useState('');
  const isOwnProfile = user && parseInt(id) === user.id;
  const [profileTab, setProfileTab] = useState('portfolio');
  const [favorites, setFavorites] = useState([]);
  const [favoritesPage, setFavoritesPage] = useState(1);
  const [favoritesLastPage, setFavoritesLastPage] = useState(1);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [draftsPage, setDraftsPage] = useState(1);
  const [draftsLastPage, setDraftsLastPage] = useState(1);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [moderationPosts, setModerationPosts] = useState([]);
  const [moderationPage, setModerationPage] = useState(1);
  const [moderationLastPage, setModerationLastPage] = useState(1);
  const [moderationLoading, setModerationLoading] = useState(false);
  const [moderationFilter, setModerationFilter] = useState('pending');

  const renderProfileSkeleton = () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'center' }}>
      {Array.from({ length: 6 }).map((_, idx) => (
        <div key={idx} className="admin-skeleton-card" style={{ width: '260px' }}>
          <div className="admin-skeleton admin-skeleton--image" />
          <div className="admin-skeleton admin-skeleton--line" />
          <div className="admin-skeleton admin-skeleton--line short" />
        </div>
      ))}
    </div>
  );
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [followLoadingIds, setFollowLoadingIds] = useState(new Set());

  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      try {
        const response = await apiFetch(`/api/profiles/${id}`, { headers: { Accept: 'application/json' } });
        if (response.ok) {
          const profileData = await response.json();
          
          // Преобразуем данные API в формат, ожидаемый компонентом
          const formattedProfile = {
            id: profileData.id,
            name: `${profileData.name} ${profileData.user_surname || ''}`.trim(),
            username: profileData.username,
            avatar: profileData.avatar || '/default-avatar.svg',
            country: profileData.country || '',
            bio: profileData.bio || '',
            website: profileData.website || '',
            followers: profileData.followers_count || 0,
            following: profileData.following_count || 0,
            postsCount: profileData.posts_count || 0,
            is_banned: !!profileData.is_banned,
            ban_reason: profileData.ban_reason ? String(profileData.ban_reason).trim() : '',
          };
          
          setProfile(formattedProfile);
          setIsFollowing(!!profileData.is_following);
          
          // Загружаем посты пользователя
          const postsResponse = await apiFetch(`/api/profiles/${id}/posts`, {
            headers: { 'Accept': 'application/json' }
          });
          if (postsResponse.ok) {
            const postsData = await postsResponse.json();
            
            const formattedPosts = postsData.data.map(post => ({
              id: post.id,
              title: post.post_title,
              description: post.post_content || '',
              tags: post.tags || '',
              image: post.image_url || post.media_path || '/images/digital-art-1.jpg',
              mediaType: post.media_type || 'image',
              likes: post.like_count || 0,
              comments: post.comment_count || 0,
              post_title: post.post_title,
              post_content: post.post_content,
              media_path: post.media_path
            }));
            
            setPosts(formattedPosts);
          } else {
            setPosts([]);
          }
        } else {
          setProfile(null);
          setPosts([]);
        }
      } catch (error) {
        setProfile(null);
        setPosts([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [id]);

  useEffect(() => {
    if (!isOwnProfile || profileTab !== 'favorites') return;
    const loadFavorites = async () => {
      setFavoritesLoading(true);
      try {
        const res = await apiFetch(`/api/profile/favorites?page=${favoritesPage}&per_page=12`, {
          headers: { 'Accept': 'application/json' }
        });
        if (res.ok) {
          const data = await res.json();
          const items = (data.data || []).map(post => ({
            id: post.id,
            title: post.post_title,
            description: post.post_content || '',
            tags: post.tags || '',
            image: post.image_url || post.media_path || '/images/digital-art-1.jpg',
            mediaType: post.media_type || 'image',
            likes: post.like_count || 0,
            comments: post.comment_count || 0,
            post_title: post.post_title,
            post_content: post.post_content,
            media_path: post.media_path
          }));
          setFavorites(items);
          setFavoritesLastPage(data.last_page || 1);
        } else {
          setFavorites([]);
        }
      } catch {
        setFavorites([]);
      } finally {
        setFavoritesLoading(false);
      }
    };
    loadFavorites();
  }, [isOwnProfile, profileTab, favoritesPage]);

  useEffect(() => {
    if (!isOwnProfile || profileTab !== 'drafts') return;
    const loadDrafts = async () => {
      setDraftsLoading(true);
      try {
        const res = await apiFetch(`/api/profile/drafts?page=${draftsPage}&per_page=12`, {
          headers: { 'Accept': 'application/json' }
        });
        if (res.ok) {
          const data = await res.json();
          const items = (data.data || []).map(post => ({
            id: post.id,
            title: post.post_title,
            description: post.post_content || '',
            tags: post.tags || '',
            image: post.image_url || post.media_path || '/images/digital-art-1.jpg',
            mediaType: post.media_type || 'image',
            likes: post.like_count || 0,
            comments: post.comment_count || 0,
            post_title: post.post_title,
            post_content: post.post_content,
            media_path: post.media_path
          }));
          setDrafts(items);
          setDraftsLastPage(data.last_page || 1);
        } else setDrafts([]);
      } catch {
        setDrafts([]);
      } finally {
        setDraftsLoading(false);
      }
    };
    loadDrafts();
  }, [isOwnProfile, profileTab, draftsPage]);

  useEffect(() => {
    if (!isOwnProfile || profileTab !== 'moderation') return;
    const loadModerationPosts = async () => {
      setModerationLoading(true);
      try {
        const res = await apiFetch(`/api/profile/moderation-posts?status=${moderationFilter}&page=${moderationPage}&per_page=12`, {
          headers: { 'Accept': 'application/json' }
        });
        if (res.ok) {
          const data = await res.json();
          const items = (data.data || []).map(post => ({
            id: post.id,
            title: post.post_title,
            description: post.post_content || '',
            tags: post.tags || '',
            image: post.image_url || post.media_path || '/images/digital-art-1.jpg',
            mediaType: post.media_type || 'image',
            likes: post.like_count || 0,
            comments: post.comment_count || 0,
            post_title: post.post_title,
            post_content: post.post_content,
            media_path: post.media_path,
            moderation_status: post.moderation_status,
            moderation_rejection_reason: post.moderation_rejection_reason || '',
          }));
          setModerationPosts(items);
          setModerationLastPage(data.last_page || 1);
        } else setModerationPosts([]);
      } catch {
        setModerationPosts([]);
      } finally {
        setModerationLoading(false);
      }
    };
    loadModerationPosts();
  }, [isOwnProfile, profileTab, moderationFilter, moderationPage]);

  const loadFollowers = async () => {
    if (!id || !isAuthenticated) return;
    setListLoading(true);
    try {
      const res = await apiFetch(`/api/users/${id}/followers`, {
        headers: { Accept: 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        setFollowersList(Array.isArray(data) ? data : []);
      } else setFollowersList([]);
    } catch {
      setFollowersList([]);
    } finally {
      setListLoading(false);
    }
  };

  const loadFollowing = async () => {
    if (!id || !isAuthenticated) return;
    setListLoading(true);
    try {
      const res = await apiFetch(`/api/users/${id}/following`, {
        headers: { Accept: 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        setFollowingList(Array.isArray(data) ? data : []);
      } else setFollowingList([]);
    } catch {
      setFollowingList([]);
    } finally {
      setListLoading(false);
    }
  };

  const handleFollowUser = async (userId, isCurrentlyFollowing, listType, e) => {
    if (e) e.stopPropagation();
    if (!isAuthenticated || followLoadingIds.has(userId)) return;
    setFollowLoadingIds(prev => new Set(prev).add(userId));
    try {
      const res = await apiFetch(`/api/users/${userId}/follow`, {
        method: 'POST',
        headers: { Accept: 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        const nowFollowing = !!data.following;
        if (listType === 'followers') {
          setFollowersList(prev => prev.map(u => u.id === userId ? { ...u, is_following: nowFollowing } : u));
          setFollowingList(prev => prev.map(u => u.id === userId ? { ...u, is_following: nowFollowing } : u));
          if (userId === profile?.id) {
            setIsFollowing(nowFollowing);
            setProfile(prev => prev ? { ...prev, followers: Math.max(0, prev.followers + (nowFollowing ? 1 : -1)) } : prev);
          }
        } else {
          if (!nowFollowing) {
            setFollowingList(prev => prev.filter(u => u.id !== userId));
            if (isOwnProfile && profile) setProfile(prev => prev ? { ...prev, following: Math.max(0, prev.following - 1) } : prev);
          } else {
            setFollowingList(prev => prev.map(u => u.id === userId ? { ...u, is_following: true } : u));
          }
        }
      } else toast.error('Не удалось изменить подписку');
    } catch {
      toast.error('Ошибка соединения');
    } finally {
      setFollowLoadingIds(prev => { const s = new Set(prev); s.delete(userId); return s; });
    }
  };

  const handleFollow = async () => {
    if (!isAuthenticated) {
      const msg = 'Для подписки необходимо войти в систему';
      setError(msg);
      toast.error(msg);
      return;
    }
    if (!profile) return;
    try {
      const response = await apiFetch(`/api/users/${profile.id}/follow`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json'
        }
      });
      if (response.ok) {
        const result = await response.json();
        const following = !!result.following;
        setIsFollowing(following);
        setProfile(prev => prev ? { ...prev, followers: Math.max(0, prev.followers + (following ? 1 : -1)) } : prev);
        setError('');
      } else {
        const msg = 'Не удалось изменить подписку. Попробуйте позже.';
        setError(msg);
        toast.error(msg);
      }
    } catch (e) {
      const msg = 'Ошибка соединения с сервером';
      setError(msg);
      toast.error(msg);
    }
  };

  // Функция для безопасной загрузки изображений постов
  const handleImageError = (e) => {
    e.target.src = '/images/digital-art-1.jpg';
  };

  // Функция для безопасной загрузки аватара
  const handleAvatarError = (e) => {
    e.target.src = '/default-avatar.svg';
  };

  if (isLoading) {
    return (
      <div className="main-content">
        <EmptyState title="Загрузка профиля" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="main-content">
        <EmptyState title="Профиль не найден" actions={<button className="btn btn-primary" onClick={() => navigate('/')}>На главную</button>} />
      </div>
    );
  }

  return (
    <div className="main-content">
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/" className="ui-page-back">
          ← Назад к ленте
        </Link>
      </div>

      {/* Сообщение об ошибке */}
      <Alert type="error" message={error} onClose={() => setError('')} />

      <div className="profile-grid" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem' }}>
        {/* Левая панель - информация о пользователе */}
        <div>
          <div className="ui-panel" style={{ textAlign: 'center' }}>
            <img
              src={profile.avatar}
              alt={profile.name}
              onError={handleAvatarError}
              className="profile-avatar-lg"
            />
            {profile.is_banned && (
              <span className="profile-banned-badge" title="Заблокирован">
                БАН
              </span>
            )}
            {profile.is_banned && profile.ban_reason && (
              <p className="profile-ban-reason">
                Причина блокировки: {profile.ban_reason}
              </p>
            )}
            <h1 style={{ 
              fontSize: '1.5rem', 
              fontWeight: 'bold', 
              marginBottom: '0.5rem',
              color: '#111827',
              fontFamily: 'JetBrains Mono, monospace',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              wordBreak: 'break-word'
            }}>
              {profile.name}
            </h1>
            
            <div style={{ 
              color: '#6b7280', 
              marginBottom: '1rem',
              fontSize: '0.875rem',
              fontFamily: 'JetBrains Mono, monospace',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              @{profile.username}
            </div>
            
            <div style={{ 
              color: '#6b7280', 
              marginBottom: '1.5rem',
              fontSize: '0.875rem',
              fontFamily: 'JetBrains Mono, monospace',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {profile.country}
            </div>
            
            <p style={{ 
              color: '#374151',
              lineHeight: '1.5',
              marginBottom: '1.5rem',
              fontSize: '0.875rem',
              fontFamily: 'JetBrains Mono, monospace',
              wordBreak: 'break-word',
              overflowWrap: 'break-word'
            }}>
              {profile.bio}
            </p>
            
            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#7B0000',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  marginBottom: '1.5rem',
                  display: 'block',
                  fontFamily: 'JetBrains Mono, monospace',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  wordBreak: 'break-all'
                }}
                title={profile.website}
              >
                {profile.website}
              </a>
            )}
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-around',
              alignItems: 'center',
              marginBottom: '1.5rem',
              padding: '1rem 0',
              borderTop: '1px solid #e5e7eb',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111827', fontFamily: 'JetBrains Mono, monospace' }}>
                  {profile.postsCount}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', fontFamily: 'JetBrains Mono, monospace' }}>Работ</div>
              </div>
              <button
                type="button"
                onClick={() => { setShowFollowersModal(true); loadFollowers(); }}
                className="profile-stat-button"
              >
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111827' }}>
                  {profile.followers}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Подписчиков</div>
              </button>
              <button
                type="button"
                onClick={() => { setShowFollowingModal(true); loadFollowing(); }}
                className="profile-stat-button"
              >
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111827' }}>
                  {profile.following}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Подписок</div>
              </button>
            </div>
            
            {!isOwnProfile && (
              <button
                onClick={handleFollow}
                className={isFollowing ? 'btn btn-outline' : 'btn btn-primary'}
                style={{ width: '100%' }}
              >
                {isFollowing ? 'Отписаться' : 'Подписаться'}
              </button>
            )}
          </div>
        </div>

        {/* Правая панель - портфолио / избранное */}
        <div>
          <div className="profile-topbar">
            {isOwnProfile ? (
              <>
                <div className="profile-tabs">
                  <button
                    type="button"
                    onClick={() => setProfileTab('portfolio')}
                    className={profileTab === 'portfolio' ? 'btn btn-primary' : 'btn btn-outline'}
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    Моё портфолио
                  </button>
                  <button
                    type="button"
                    onClick={() => { setProfileTab('favorites'); setFavoritesPage(1); }}
                    className={profileTab === 'favorites' ? 'btn btn-primary' : 'btn btn-outline'}
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    Избранное
                  </button>
                  <button
                    type="button"
                    onClick={() => { setProfileTab('drafts'); setDraftsPage(1); }}
                    className={profileTab === 'drafts' ? 'btn btn-primary' : 'btn btn-outline'}
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    Черновики
                  </button>
                  <button
                    type="button"
                    onClick={() => { setProfileTab('moderation'); setModerationPage(1); setModerationFilter('pending'); }}
                    className={profileTab === 'moderation' ? 'btn btn-primary' : 'btn btn-outline'}
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    На рассмотрении
                  </button>
                </div>
                {profileTab === 'portfolio' && (
                  <Link to="/create" className="btn btn-primary">
                    + Добавить работу
                  </Link>
                )}
              </>
            ) : (
              <h2 className="ui-section-title" style={{ marginBottom: 0 }}>Портфолио</h2>
            )}
          </div>

          {(profileTab === 'favorites' && favoritesLoading) || (profileTab === 'drafts' && draftsLoading) || (profileTab === 'moderation' && moderationLoading) ? (
            <div className="ui-form-help" style={{ padding: '1rem 0' }}>{renderProfileSkeleton()}</div>
          ) : null}
          {profileTab === 'moderation' && (
            <div className="profile-tabs" style={{ marginBottom: '1rem' }}>
              <button
                type="button"
                className={moderationFilter === 'pending' ? 'btn btn-primary' : 'btn btn-outline'}
                onClick={() => { setModerationFilter('pending'); setModerationPage(1); }}
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                Ожидают рассмотрения
              </button>
              <button
                type="button"
                className={moderationFilter === 'rejected' ? 'btn btn-primary' : 'btn btn-outline'}
                onClick={() => { setModerationFilter('rejected'); setModerationPage(1); }}
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                Отклоненные
              </button>
            </div>
          )}
          
          {(() => {
            const tabPosts = profileTab === 'portfolio'
              ? posts
              : profileTab === 'favorites'
                ? favorites
                : profileTab === 'drafts'
                  ? drafts
                  : moderationPosts;
            if (tabPosts.length === 0) {
              return null;
            }
            return (
              <MasonryGrid>
                {tabPosts.map((post) => (
                  <ProfilePostCard
                    key={post.id}
                    post={post}
                    profileTab={profileTab}
                    moderationFilter={moderationFilter}
                    onImageError={handleImageError}
                  />
                ))}
              </MasonryGrid>
            );
          })()}
          
          {((profileTab === 'portfolio' && posts.length === 0) || (profileTab === 'favorites' && !favoritesLoading && favorites.length === 0) || (profileTab === 'drafts' && !draftsLoading && drafts.length === 0) || (profileTab === 'moderation' && !moderationLoading && moderationPosts.length === 0)) && (
            <>
              {profileTab === 'drafts' ? (
                <EmptyState
                  title="У вас пока нет черновиков"
                  text="Сохраняйте публикации как черновики при создании"
                  actions={<Link to="/create" className="btn btn-primary">Создать публикацию</Link>}
                />
              ) : profileTab === 'favorites' ? (
                <EmptyState
                  title="У вас пока нет избранных публикаций"
                  text="Добавляйте понравившиеся работы в избранное с ленты или страницы публикации"
                />
              ) : profileTab === 'moderation' ? (
                <EmptyState
                  title={moderationFilter === 'pending' ? 'Нет публикаций, ожидающих рассмотрения' : 'Нет отклоненных публикаций'}
                  text={moderationFilter === 'pending' ? 'После одобрения работа появится в разделе «Моё портфолио»' : 'Здесь отображаются публикации, отклоненные модерацией'}
                  actions={
                    <>
                      <Link to="/create" className="btn btn-primary">Создать публикацию</Link>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => setModerationFilter(moderationFilter === 'pending' ? 'rejected' : 'pending')}
                      >
                        {moderationFilter === 'pending' ? 'Перейти в отклоненные' : 'Перейти в ожидающие'}
                      </button>
                    </>
                  }
                />
              ) : (
                <EmptyState
                  title={isOwnProfile ? 'Ваше портфолио пусто' : 'Портфолио пусто'}
                  text={isOwnProfile ? 'Добавьте свою первую работу' : 'Пользователь еще не добавил ни одной работы'}
                  actions={isOwnProfile ? <Link to="/create" className="btn btn-primary">Добавить первую работу</Link> : null}
                />
              )}
            </>
          )}
          {profileTab === 'favorites' && favoritesLastPage > 1 && !favoritesLoading && (
            <div className="profile-pagination">
              <button
                type="button"
                className="btn btn-outline"
                disabled={favoritesPage <= 1}
                onClick={() => setFavoritesPage(p => Math.max(1, p - 1))}
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                ← Назад
              </button>
              <span className="profile-pagination-info">
                {favoritesPage} / {favoritesLastPage}
              </span>
              <button
                type="button"
                className="btn btn-outline"
                disabled={favoritesPage >= favoritesLastPage}
                onClick={() => setFavoritesPage(p => Math.min(favoritesLastPage, p + 1))}
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                Вперёд →
              </button>
            </div>
          )}
          {profileTab === 'drafts' && draftsLastPage > 1 && !draftsLoading && (
            <div className="profile-pagination">
              <button
                type="button"
                className="btn btn-outline"
                disabled={draftsPage <= 1}
                onClick={() => setDraftsPage(p => Math.max(1, p - 1))}
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                ← Назад
              </button>
              <span className="profile-pagination-info">
                {draftsPage} / {draftsLastPage}
              </span>
              <button
                type="button"
                className="btn btn-outline"
                disabled={draftsPage >= draftsLastPage}
                onClick={() => setDraftsPage(p => Math.min(draftsLastPage, p + 1))}
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                Вперёд →
              </button>
            </div>
          )}
          {profileTab === 'moderation' && moderationLastPage > 1 && !moderationLoading && (
            <div className="profile-pagination">
              <button
                type="button"
                className="btn btn-outline"
                disabled={moderationPage <= 1}
                onClick={() => setModerationPage(p => Math.max(1, p - 1))}
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                ← Назад
              </button>
              <span className="profile-pagination-info">
                {moderationPage} / {moderationLastPage}
              </span>
              <button
                type="button"
                className="btn btn-outline"
                disabled={moderationPage >= moderationLastPage}
                onClick={() => setModerationPage(p => Math.min(moderationLastPage, p + 1))}
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                Вперёд →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Модалка: Подписчики */}
      {showFollowersModal && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
          onClick={() => setShowFollowersModal(false)}
        >
          <div
            className="ui-social-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ui-social-modal__header">
              <h2 className="ui-social-modal__title">Подписчики</h2>
              <button
                type="button"
                onClick={() => setShowFollowersModal(false)}
                className="ui-icon-btn"
              >
                ×
              </button>
            </div>
            <div className="ui-social-modal__body">
              {listLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280', fontFamily: 'JetBrains Mono, monospace' }}>Загрузка...</div>
              ) : followersList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280', fontFamily: 'JetBrains Mono, monospace' }}>Подписчиков пока нет</div>
              ) : (
                followersList.map((u) => (
                  <div
                    key={u.id}
                    className="ui-social-card"
                  >
                    <Link
                      to={`/profile/${u.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        flex: 1,
                        textDecoration: 'none',
                        color: 'inherit',
                        minWidth: 0
                      }}
                      onClick={() => setShowFollowersModal(false)}
                    >
                      <img
                        src={u.avatar || '/default-avatar.svg'}
                        alt=""
                        onError={(e) => { e.target.src = '/default-avatar.svg'; }}
                        className="ui-avatar-44"
                      />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: '600', fontFamily: 'JetBrains Mono, monospace', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name || 'Пользователь'}</div>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280', fontFamily: 'JetBrains Mono, monospace' }}>@{u.username}</div>
                      </div>
                    </Link>
                    {user && u.id !== user.id && (
                      <button
                        type="button"
                        onClick={(e) => handleFollowUser(u.id, u.is_following, 'followers', e)}
                        disabled={followLoadingIds.has(u.id)}
                        className={u.is_following ? 'btn btn-outline' : 'btn btn-primary'}
                        style={{ flexShrink: 0, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                      >
                        {followLoadingIds.has(u.id) ? '...' : u.is_following ? 'В подписках' : 'Подписаться'}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Модалка: Подписки */}
      {showFollowingModal && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
          onClick={() => setShowFollowingModal(false)}
        >
          <div
            className="ui-social-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ui-social-modal__header">
              <h2 className="ui-social-modal__title">Подписки</h2>
              <button
                type="button"
                onClick={() => setShowFollowingModal(false)}
                className="ui-icon-btn"
              >
                ×
              </button>
            </div>
            <div className="ui-social-modal__body">
              {listLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280', fontFamily: 'JetBrains Mono, monospace' }}>Загрузка...</div>
              ) : followingList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280', fontFamily: 'JetBrains Mono, monospace' }}>Подписок пока нет</div>
              ) : (
                followingList.map((u) => (
                  <div
                    key={u.id}
                    className="ui-social-card"
                  >
                    <Link
                      to={`/profile/${u.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        flex: 1,
                        textDecoration: 'none',
                        color: 'inherit',
                        minWidth: 0
                      }}
                      onClick={() => setShowFollowingModal(false)}
                    >
                      <img
                        src={u.avatar || '/default-avatar.svg'}
                        alt=""
                        onError={(e) => { e.target.src = '/default-avatar.svg'; }}
                        className="ui-avatar-44"
                      />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: '600', fontFamily: 'JetBrains Mono, monospace', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name || 'Пользователь'}</div>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280', fontFamily: 'JetBrains Mono, monospace' }}>@{u.username}</div>
                      </div>
                    </Link>
                    {user && u.id !== user.id && (
                      isOwnProfile ? (
                        <button
                          type="button"
                          onClick={(e) => handleFollowUser(u.id, true, 'following', e)}
                          disabled={followLoadingIds.has(u.id)}
                          className="btn btn-outline"
                          style={{ flexShrink: 0, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', padding: '0.35rem 0.75rem', borderColor: '#7B0000', color: '#7B0000' }}
                        >
                          {followLoadingIds.has(u.id) ? '...' : 'Отписаться'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => handleFollowUser(u.id, u.is_following, 'followers', e)}
                          disabled={followLoadingIds.has(u.id)}
                          className={u.is_following ? 'btn btn-outline' : 'btn btn-primary'}
                          style={{ flexShrink: 0, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                        >
                          {followLoadingIds.has(u.id) ? '...' : u.is_following ? 'В подписках' : 'Подписаться'}
                        </button>
                      )
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;