import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../../css/app.css';
function Profile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [error, setError] = useState('');

  // Определяем, это свой профиль или чужой
  const isOwnProfile = user && parseInt(id) === user.id;
  
  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      try {
        // Загружаем профиль из API
        const response = await fetch(`/api/profiles/${id}`, {
          headers: { 'Accept': 'application/json' }
        });
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
            postsCount: profileData.posts_count || 0
          };
          
          setProfile(formattedProfile);
          setIsFollowing(!!profileData.is_following);
          
          // Загружаем посты пользователя
          const postsResponse = await fetch(`/api/profiles/${id}/posts`, {
            headers: { 'Accept': 'application/json' }
          });
          if (postsResponse.ok) {
            const postsData = await postsResponse.json();
            
            const formattedPosts = postsData.data.map(post => ({
              id: post.id,
              title: post.post_title,
              description: post.post_content || '',
              tags: post.tags || '',
              image: post.image_url || post.media_path || '/images/digital-art-1.svg',
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

  const handleFollow = async () => {
    if (!isAuthenticated || !profile) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/users/${profile.id}/follow`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
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
        setError('Не удалось изменить подписку. Попробуйте позже.');
      }
    } catch (e) {
      setError('Ошибка соединения с сервером');
    }
  };

  // Функция для безопасной загрузки изображений постов
  const handleImageError = (e) => {
    e.target.src = '/images/digital-art-1.svg';
  };

  // Функция для безопасной загрузки аватара
  const handleAvatarError = (e) => {
    e.target.src = '/default-avatar.svg';
  };

  if (isLoading) {
    return (
      <div className="main-content">
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div style={{ fontSize: '1.5rem', color: '#6b7280' }}>Загрузка...</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="main-content">
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div style={{ fontSize: '1.5rem', color: '#6b7280' }}>Профиль не найден</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="main-content">
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div style={{ fontSize: '1.5rem', color: '#6b7280', marginBottom: '1rem' }}>
            Необходима авторизация
          </div>
          <div style={{ color: '#9ca3af', marginBottom: '2rem' }}>
            Для просмотра профилей необходимо войти в систему
          </div>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/')}
          >
            Вернуться на главную
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div style={{ marginBottom: '2rem' }}>
        <Link to="/" style={{ color: '#7B0000', textDecoration: 'none', fontFamily: 'JetBrains Mono, monospace' }}>
          ← Назад к ленте
        </Link>
      </div>

      {/* Сообщение об ошибке */}
      {error && (
        <div style={{
          backgroundColor: '#f5f5f5',
          border: '1px solid #7B0000',
          borderRadius: '8px',
          padding: '0.75rem',
          marginBottom: '1rem',
          color: '#7B0000',
          fontSize: '0.875rem',
          fontFamily: 'JetBrains Mono, monospace',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {error}
          <button
            onClick={() => setError('')}
            style={{
              background: 'none',
              border: 'none',
              color: '#7B0000',
              cursor: 'pointer',
              fontSize: '1.25rem',
              lineHeight: 1,
              padding: 0
            }}
          >
            ×
          </button>
        </div>
      )}

      <div className="profile-grid" style={{ 
        display: 'grid', 
        gridTemplateColumns: '300px 1fr', 
        gap: '3rem'
      }}>
        {/* Левая панель - информация о пользователе */}
        <div>
          <div style={{
            backgroundColor: '#DEDDD8',
            borderRadius: '12px',
            padding: '2rem',
            border: '1px solid #D4D1CC',
            textAlign: 'center'
          }}>
            <img
              src={profile.avatar}
              alt={profile.name}
              onError={handleAvatarError}
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                marginBottom: '1rem',
                border: '4px solid #e5e7eb'
              }}
            />
            
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
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111827', fontFamily: 'JetBrains Mono, monospace' }}>
                  {profile.followers}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', fontFamily: 'JetBrains Mono, monospace' }}>Подписчиков</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111827', fontFamily: 'JetBrains Mono, monospace' }}>
                  {profile.following}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', fontFamily: 'JetBrains Mono, monospace' }}>Подписок</div>
              </div>
            </div>
            
            {!isOwnProfile && (
              <button
                onClick={handleFollow}
                className={isFollowing ? 'btn btn-secondary' : 'btn btn-primary'}
                style={{ width: '100%' }}
              >
                {isFollowing ? 'Отписаться' : 'Подписаться'}
              </button>
            )}
          </div>
        </div>

        {/* Правая панель - портфолио */}
        <div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '2rem'
          }}>
            <h2 style={{ 
              fontSize: '1.5rem', 
              fontWeight: 'bold',
              color: '#111827',
              fontFamily: 'JetBrains Mono, monospace'
            }}>
              Портфолио
            </h2>
            
            {isOwnProfile && (
              <Link to="/create" className="btn btn-primary">
                + Добавить работу
              </Link>
            )}
          </div>
          
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1.5rem',
            justifyContent: 'center',
            alignItems: 'flex-start'
          }}>
            {posts.map(post => {
              return (
                <Link
                  key={post.id}
                  to={`/post/${post.id}`}
                  style={{ textDecoration: 'none', color: 'inherit', flex: '0 0 auto' }}
                >
                  <div style={{
                    backgroundColor: '#DEDDD8',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '1px solid #D4D1CC',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  >
                    <div style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#D4D1CC',
                      overflow: 'hidden'
                    }}>
                      <img
                        src={post.image}
                        alt={post.title}
                        onError={handleImageError}
                        style={{
                          width: 'auto',
                          height: '300px',
                          objectFit: 'contain',
                          display: 'block',
                          maxWidth: '100%'
                        }}
                      />
                    </div>
                    <div style={{ padding: '1rem', width: '100%' }}>
                      <h3 style={{ 
                        fontSize: '0.95rem', 
                        fontWeight: '600', 
                        marginBottom: '0.5rem',
                        color: '#111827',
                        fontFamily: 'JetBrains Mono, monospace',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        minHeight: '2.8em',
                        lineHeight: '1.4'
                      }}>
                        {post.title}
                      </h3>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        fontSize: '0.8rem',
                        color: '#6b7280',
                        fontFamily: 'JetBrains Mono, monospace'
                      }}>
                        <span>{post.likes} лайков</span>
                        <span>{post.comments} комментариев</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          
          {posts.length === 0 && (
            <div style={{ 
              textAlign: 'center', 
              padding: '4rem 0',
              backgroundColor: '#DEDDD8',
              borderRadius: '12px',
              border: '1px solid #D4D1CC'
            }}>
              <div style={{ fontSize: '1.25rem', color: '#6b7280', marginBottom: '1rem', fontFamily: 'JetBrains Mono, monospace' }}>
                {isOwnProfile ? 'Ваше портфолио пусто' : 'Портфолио пусто'}
              </div>
              <div style={{ color: '#9ca3af', marginBottom: '2rem', fontFamily: 'JetBrains Mono, monospace' }}>
                {isOwnProfile ? 'Добавьте свою первую работу' : 'Пользователь еще не добавил ни одной работы'}
              </div>
              {isOwnProfile && (
                <Link to="/create" className="btn btn-primary">
                  Добавить первую работу
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile;