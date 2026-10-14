import React from 'react';

const backgroundVideo = new URL('../../assets/oficia-login-background.mp4', import.meta.url).href;

export function AuthVideoBackground() {
  return <div className="auth-video-background" aria-hidden="true">
    <video autoPlay loop muted playsInline preload="metadata" poster="/icon-512.png">
      <source src={backgroundVideo} type="video/mp4" />
    </video>
  </div>;
}
