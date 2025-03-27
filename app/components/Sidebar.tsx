'use client';

import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const navigation = [
  {
    name: 'Tracker',
    href: '/'
  },
  {
    name: 'Competitions',
    href: '/competitions'
  }
];

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const pathname = usePathname();
  const [isDesktopExpanded, setIsDesktopExpanded] = useState(false);

  // Navigation icons mapping to ensure consistency
  const getNavIcon = (name: string) => {
    switch (name) {
      case 'Tracker':
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
        );
      case 'Competitions':
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
          </svg>
        );
      default:
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
          </svg>
        );
    }
  };

  // Handle navigation click - auto-collapse sidebar when clicking a link
  const handleNavClick = () => {
    setIsDesktopExpanded(false);
    setIsOpen(false);
  };

  // Desktop sidebar - collapsible
  const DesktopSidebar = (
    <div className={`hidden md:flex h-full flex-col bg-[#0A0B0F] border-r border-gray-800 sidebar-container fixed inset-y-0 left-0 transition-all duration-300 ${isDesktopExpanded ? 'w-[200px]' : 'w-[50px]'}`}>
      {isDesktopExpanded ? (
        <>
          <div className="flex-1 py-4">
            <div className="flex justify-end px-4 mb-4">
              <button
                type="button"
                className="text-gray-500 hover:text-blue-400 transition-colors"
                onClick={() => setIsDesktopExpanded(false)}
              >
                <span className="sr-only">Collapse sidebar</span>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </div>
            <nav className="flex flex-col px-2 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`px-3 py-2 text-sm transition-colors rounded-md flex items-center ${
                      isActive
                        ? 'text-blue-400 bg-blue-400/10'
                        : 'text-gray-400 hover:text-blue-400 hover:bg-blue-400/5'
                    }`}
                    onClick={handleNavClick}
                  >
                    <span className="mr-3">{getNavIcon(item.name)}</span>
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center py-4">
          <button
            type="button"
            className="text-gray-500 hover:text-blue-400 transition-colors my-2"
            onClick={() => setIsDesktopExpanded(true)}
          >
            <span className="sr-only">Expand sidebar</span>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <nav className="flex flex-col items-center space-y-4 mt-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`p-2 transition-colors rounded-md ${
                    isActive
                      ? 'text-blue-400 bg-blue-400/10'
                      : 'text-gray-400 hover:text-blue-400 hover:bg-blue-400/5'
                  }`}
                  title={item.name}
                >
                  <span className="sr-only">{item.name}</span>
                  {getNavIcon(item.name)}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );

  // Mobile sidebar - slides out
  const MobileSidebar = (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50 md:hidden" onClose={setIsOpen}>
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 left-0 flex max-w-full">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-200"
                enterFrom="-translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-200"
                leaveFrom="translate-x-0"
                leaveTo="-translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-[200px]">
                  <div className="flex h-full flex-col bg-[#0A0B0F] shadow-xl">
                    <div className="px-4 py-4 border-b border-gray-800">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-blue-400">Navigation</div>
                        <button
                          type="button"
                          className="text-gray-500 hover:text-blue-400 transition-colors"
                          onClick={() => setIsOpen(false)}
                        >
                          <span className="sr-only">Close panel</span>
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto py-4">
                      <nav className="flex flex-col px-2 space-y-1">
                        {navigation.map((item) => {
                          const isActive = pathname === item.href;
                          return (
                            <Link
                              key={item.name}
                              href={item.href}
                              className={`px-3 py-2 text-sm transition-colors rounded-md flex items-center ${
                                isActive
                                  ? 'text-blue-400 bg-blue-400/10'
                                  : 'text-gray-400 hover:text-blue-400 hover:bg-blue-400/5'
                              }`}
                              onClick={handleNavClick}
                            >
                              <span className="mr-3">{getNavIcon(item.name)}</span>
                              {item.name}
                            </Link>
                          );
                        })}
                      </nav>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );

  return (
    <>
      {DesktopSidebar}
      {MobileSidebar}
    </>
  );
} 