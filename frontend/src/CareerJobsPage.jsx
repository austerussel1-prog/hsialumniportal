import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Briefcase, Laptop, GraduationCap, Handshake, Sparkle } from '@phosphor-icons/react';
import Sidebar from './components/Sidebar';

const featureCards = [
  {
    label: 'Exclusive HSI Job Postings',
    description: 'Access role openings curated for alumni and graduating members.',
    icon: Briefcase,
    to: '/training?category=exclusive',
  },
  {
    label: 'Freelance & Project-Based Opportunities',
    description: 'Discover flexible short-term projects and remote gigs.',
    icon: Laptop,
    to: '/training?category=freelance',
  },
  {
    label: 'Internship & OJT Opportunities',
    description: 'Explore student-ready internships and practical training roles.',
    icon: GraduationCap,
    to: '/training?category=internship',
  },
  {
    label: 'Refer a Friend',
    description: 'Invite your friends and share links to open opportunities.',
    icon: Handshake,
    to: '/refer-friend',
  },
];

export default function CareerJobsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <motion.div
      style={{ display: 'flex', minHeight: '100vh', background: '#f6f2ea' }}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      <Sidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(!sidebarOpen)} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '22px 34px 28px', gap: '18px' }}>
        <section
          style={{
            borderRadius: '24px',
            padding: '28px 34px',
            background: 'linear-gradient(120deg, #3d4451 0%, #635229 52%, #e1aa18 100%)',
            boxShadow: '0 16px 28px rgba(62, 44, 17, 0.22)',
            color: '#fffaf0',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: '220px',
              height: '220px',
              right: '-58px',
              top: '-48px',
              borderRadius: '999px',
              background: 'rgba(255, 247, 228, 0.16)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              width: '140px',
              height: '140px',
              right: '74px',
              bottom: '-72px',
              borderRadius: '999px',
              background: 'rgba(255, 247, 228, 0.12)',
            }}
          />

          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.88 }}>
              <img
                src="/career-logo.svg"
                alt="Career & Job Opportunities logo"
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '8px',
                  background: '#fff',
                }}
              />
              <Sparkle size={16} weight="fill" />
              <span style={{ fontSize: '20px', fontWeight: '700', letterSpacing: '0.2px' }}>Career &amp; Job Opportunities.</span>
            </div>
            <h1 style={{ marginTop: '14px', fontSize: '42px', fontWeight: '800', lineHeight: 1.08 }}>
              Build your next move.
            </h1>
            <p style={{ marginTop: '10px', maxWidth: '690px', fontSize: '20px', lineHeight: 1.4, color: '#fef3c7' }}>
              Browse full-time roles, internship tracks, and project-based work from one place.
            </p>
            <div
              style={{
                marginTop: '22px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255, 248, 235, 0.16)',
                border: '1px solid rgba(255, 241, 224, 0.32)',
                borderRadius: '999px',
                padding: '9px 14px',
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#eff6ff' }}>Alumni Career Access</span>
            </div>
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: '26px', fontWeight: '800', color: '#1f2937', marginBottom: '10px' }}>
            Browse Opportunities
          </h2>
          <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '14px' }}>
            Choose a section to view jobs and opportunities.
          </p>
          <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
            {featureCards.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                style={{
                  background: '#ffffff',
                  border: '1px solid #efe4d3',
                  borderRadius: '16px',
                  padding: '18px',
                  display: 'flex',
                  gap: '14px',
                  textDecoration: 'none',
                  transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
                  boxShadow: '0 4px 10px rgba(181, 141, 64, 0.08)',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.boxShadow = '0 10px 20px rgba(176, 122, 21, 0.14)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = '#e7c67a';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 10px rgba(181, 141, 64, 0.08)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = '#efe4d3';
                }}
              >
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '14px',
                    background: 'linear-gradient(145deg, #f8ebcd 0%, #f2d58b 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <item.icon size={28} color="#8a6513" weight="duotone" />
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ color: '#111827', fontSize: '18px', fontWeight: '800', lineHeight: 1.2 }}>
                    {item.label}
                  </div>
                  <div style={{ color: '#4b5563', marginTop: '6px', fontSize: '14px', lineHeight: 1.35 }}>
                    {item.description}
                  </div>
                </div>
                <div style={{ alignSelf: 'flex-start', paddingTop: '2px' }}>
                  <ArrowRight size={22} color="#b07a15" weight="bold" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </motion.div>
  );
}
