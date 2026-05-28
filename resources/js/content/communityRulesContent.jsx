import React from 'react';

const listStyle = { margin: '0.5rem 0 1rem', paddingLeft: '1.25rem', lineHeight: 1.65 };
const sectionStyle = { marginBottom: '1.75rem' };
const h2Style = { fontSize: '1.125rem', marginBottom: '0.75rem', color: '#111827' };
const pStyle = { marginBottom: '0.75rem', lineHeight: 1.65, color: '#374151' };

export function CommunityRulesBody() {
  return (
    <>
      <section style={sectionStyle}>
        <h2 style={h2Style}>Тематика сообщества</h2>
        <p style={pStyle}>
          Данное сообщество предназначено исключительно для публикации цифрового искусства, рисунков,
          иллюстраций, концепт-артов, 3D-моделей, анимации и других художественных работ.
        </p>
        <p style={pStyle}><strong>Допускаются:</strong></p>
        <ul style={listStyle}>
          <li>цифровые рисунки;</li>
          <li>иллюстрации;</li>
          <li>концепт-арты;</li>
          <li>персонажи;</li>
          <li>3D-модели;</li>
          <li>анимации;</li>
          <li>художественные проекты.</li>
        </ul>
        <p style={pStyle}><strong>Не допускаются:</strong></p>
        <ul style={listStyle}>
          <li>фотографии автомобилей;</li>
          <li>спортивный контент;</li>
          <li>новости;</li>
          <li>политический контент;</li>
          <li>рекламные публикации;</li>
          <li>контент, не относящийся к искусству;</li>
          <li>любые материалы, выходящие за рамки тематики сообщества.</li>
        </ul>
      </section>

      <section id="publication-rules" style={sectionStyle}>
        <h2 style={h2Style}>Правила публикаций</h2>
        <p style={pStyle}><strong>Запрещается:</strong></p>
        <ul style={listStyle}>
          <li>использование нецензурной лексики;</li>
          <li>оскорбления пользователей;</li>
          <li>травля и агрессивное поведение;</li>
          <li>реклама товаров и услуг;</li>
          <li>спам;</li>
          <li>публикация запрещённых материалов;</li>
          <li>обход системы модерации;</li>
          <li>размещение вредоносных ссылок.</li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Автоматическая модерация</h2>
        <p style={pStyle}>Пользователь соглашается с тем, что:</p>
        <ul style={listStyle}>
          <li>комментарии могут автоматически проверяться системой модерации;</li>
          <li>публикации могут автоматически проверяться системой модерации;</li>
          <li>комментарии, нарушающие правила сообщества, могут быть удалены без предупреждения;</li>
          <li>публикации, нарушающие правила сообщества, могут быть удалены без предупреждения;</li>
          <li>удалённый модерацией контент может не подлежать восстановлению.</li>
        </ul>
      </section>
    </>
  );
}
