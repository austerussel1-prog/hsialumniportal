import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { resolveApiAssetUrl } from '../config/api';

import {
  House,
  AddressBook,
  Briefcase,
  BookOpen,
  Medal,
  CalendarBlank,
  Megaphone,
  Handshake,
  Folder,
  ChatCircleText,
  ChatText,
  User,
  List,
  X,
} from '@phosphor-icons/react';

const navItems = [
  { name: 'Dashboard', icon: House, path: '/alumni-management' },
  { name: 'Analytics & Reports', icon: BookOpen, path: '/analytics-and-report' },
  { name: 'Admin Dashboard', icon: User, path: '/admin-dashboard', restricted: true },
  { name: 'Directory & Networking', icon: AddressBook, path: '/directory' },
  { name: 'Career & Job Opportunities', icon: Briefcase, path: '/training' },
  { name: 'Training & Learning', icon: BookOpen, path: '/training/paths' },
  { name: 'Achievements & Recognition', icon: Medal, path: '/achievements' },
  { name: 'Events & Community Engagement', icon: CalendarBlank, path: '/events' },
  { name: 'Announcements', icon: Megaphone, path: '/announcements' },
  { name: 'Mentorship & Volunteer Programs', icon: Handshake, path: '/mentorship' },
  { name: 'Inbox', icon: ChatCircleText, path: '/inbox' },
  { name: 'Documents & Records', icon: Folder, path: '/documents' },
];

function Sidebar(props) {
  const controlledOpen = typeof props.isOpen === 'boolean' ? props.isOpen : !!props.sidebarOpen;
  const toggle = typeof props.toggle === 'function'
    ? props.toggle
    : () => props.setSidebarOpen?.((prev) => !prev);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 900px)').matches;
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const sidebarRef = useRef(null);
  const location = useLocation();
  const userData = localStorage.getItem('user');
  const user = userData ? JSON.parse(userData) : null;
  const canAccessAdmin = ['super_admin', 'admin', 'hr', 'alumni_officer'].includes(user?.role);
  const profileImage = typeof user?.profileImage === 'string' && user.profileImage.trim()
    ? resolveApiAssetUrl(user.profileImage)
    : null;

  const isOpen = isMobile ? mobileOpen : controlledOpen;
  const setOpen = (value) => {
    const nextValue = !!value;
    if (isMobile) {
      setMobileOpen(nextValue);
      return;
    }
    if (typeof props.setSidebarOpen === 'function') {
      props.setSidebarOpen(nextValue);
      return;
    }
    if ((nextValue && !controlledOpen) || (!nextValue && controlledOpen)) {
      toggle?.();
    }
  };
  const toggleOpen = () => setOpen(!isOpen);
  const expanded = isMobile ? isOpen : controlledOpen || isHovered;
  const isActivePath = (path) => location.pathname === path;

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.matchMedia('(max-width: 900px)').matches;
      setIsMobile(mobile);
      if (!mobile) {
        setMobileOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const node = sidebarRef.current;
    if (!node) return;
    const saved = Number(sessionStorage.getItem('sidebar-scroll-top') || 0);
    node.scrollTop = Number.isFinite(saved) ? saved : 0;
  }, []);

  useEffect(() => {
    if (isMobile) {
      setOpen(false);
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!isMobile || !isOpen) return undefined;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isMobile, isOpen]);

  useEffect(() => {
    if (!isMobile || !isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobile, isOpen]);

  const handleSidebarScroll = () => {
    if (!sidebarRef.current) return;
    sessionStorage.setItem('sidebar-scroll-top', String(sidebarRef.current.scrollTop));
  };

  const closeMobileSidebar = () => setOpen(false);

  const sidebarClasses = `bg-[#585858] text-white h-screen overflow-y-auto transition-all duration-300 flex flex-col
    ${isMobile
      ? `fixed left-0 top-0 z-50 w-[19rem] max-w-[86vw] shadow-2xl transform ${isOpen ? 'translate-x-0' : '-translate-x-full'}`
      : `${expanded ? 'w-80' : 'w-24'} fixed left-0 top-0 z-30`
    }
  `;

  return (
    <>
      {isMobile ? (
        <div className="h-16 flex-shrink-0" />
      ) : (
        <div className="flex-shrink-0 w-24" />
      )}

      {isMobile ? (
        <div className="fixed inset-x-0 top-0 z-40 h-16 bg-[#585858] text-white border-b border-white/20">
        <div className="flex h-full items-center">
          <button
            type="button"
            onClick={toggleOpen}
            aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
            className="h-full px-4 text-white transition hover:bg-white/10"
          >
            {isOpen ? <X size={22} weight="bold" /> : <List size={22} weight="bold" />}
          </button>

          <div className="flex flex-1 items-center">
            <img src="/Logo.jpg" className="h-14 w-auto" alt="HSI logo" />
          </div>

          <div className="flex h-full items-center gap-2 bg-[#7b6a1e] px-3">
            <Link to="/profile" aria-label="Profile" className="block">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Profile"
                  className="h-9 w-9 rounded-full object-cover border-2 border-white/40"
                  onError={(event) => {
                    event.currentTarget.src = '/Logo.jpg';
                  }}
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/35 bg-white/10">
                  <User size={18} />
                </div>
              )}
            </Link>
          </div>
        </div>
        </div>
      ) : null}

      {isMobile && isOpen && (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          className="fixed inset-0 z-40 bg-black/45 md:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      <div
        id="app-sidebar"
        ref={sidebarRef}
        onScroll={handleSidebarScroll}
        onMouseEnter={() => !isMobile && !isOpen && setIsHovered(true)}
        onMouseLeave={() => !isMobile && setIsHovered(false)}
        className={sidebarClasses}
      >
        <div
          className={`flex items-center border-b border-[#D9D9D9]
            ${isMobile ? 'justify-between px-4 h-16' : `h-20 ${expanded ? 'justify-between' : 'justify-center'}`}
          `}
        >
          {isMobile || expanded ? (
            <img src="/Logo.jpg" className={`${isMobile ? 'h-16' : 'h-20'} w-auto ${isMobile ? '' : 'px-4'}`} alt="HSI logo" />
          ) : (
            <img src="/Lion.png" className="h-20 w-20" alt="HSI logo" />
          )}

          {isMobile && (
            <button
              type="button"
              onClick={closeMobileSidebar}
              aria-label="Close sidebar"
              className="rounded-full p-2 transition hover:bg-white/10"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <div className="relative">
          {expanded && (
            <div className={`text-xs ${isMobile ? 'px-6 pt-6' : 'absolute top-8 left-6'}`}>MAIN</div>
          )}

          <nav className={`flex-1 p-4 ${expanded ? (isMobile ? 'mt-2' : 'mt-9') : 'mt-4'}`}>
            {navItems.map((item, index) => {
              if (item.restricted && !canAccessAdmin) return null;

              return (
                <div key={index}>
                  <Link
                    to={item.path}
                    className={`w-full flex items-center py-3 px-4 mb-2 rounded-md transition-all
                      hover:bg-[#7D7D7D]
                      ${isActivePath(item.path) ? 'bg-[#F2C94C] text-[#2f2f2f]' : ''}
                      ${expanded ? 'justify-start' : 'justify-center'}
                    `}
                  >
                    <item.icon size={20} />
                    {expanded && <span className="ml-4 text-sm">{item.name}</span>}
                  </Link>
                </div>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-[#D9D9D9] relative mt-auto">
          {expanded && (
            <div className={`text-xs ${isMobile ? 'px-8 pt-5' : 'absolute top-5 left-8'}`}>OTHERS</div>
          )}

          <div className={`p-4 ${expanded ? 'mt-4' : ''}`}>
            <Link
              to="/profile"
              className={`flex items-center py-3 px-4 mb-2 rounded-md transition-all hover:bg-[#7D7D7D]
                ${isActivePath('/profile') ? 'bg-[#F2C94C] text-[#2f2f2f]' : ''}
                ${expanded ? 'justify-start' : 'justify-center'}
              `}
            >
              <User size={20} />
              {expanded && <span className="ml-4">Profile</span>}
            </Link>

            <Link
              to="/account?tab=feedback"
              className={`flex items-center py-3 px-4 mb-2 rounded-md transition-all hover:bg-[#7D7D7D]
                ${location.pathname === '/account' && location.search.includes('tab=feedback') ? 'bg-[#F2C94C] text-[#2f2f2f]' : ''}
                ${expanded ? 'justify-start' : 'justify-center'}
              `}
            >
              <ChatText size={20} />
              {expanded && <span className="ml-4">Feedback & Surveys</span>}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

export default Sidebar;
