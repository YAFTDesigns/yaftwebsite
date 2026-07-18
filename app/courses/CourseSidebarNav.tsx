import Link from 'next/link';
import { COURSE_NAV_LIST } from './courseNav';
import s from './course.module.css';

export default function CourseSidebarNav({ current }: { current: string }) {
  return (
    <aside className={s.sideNav}>
      <p className={s.sideNavLabel}>All courses</p>
      {COURSE_NAV_LIST.map((c) => (
        <Link
          key={c.href}
          href={c.href}
          className={`${s.sideNavItem}${c.href === current ? ` ${s.sideNavItemActive}` : ''}`}
        >
          {c.title}
        </Link>
      ))}
    </aside>
  );
}
