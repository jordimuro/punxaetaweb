"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import styles from "./site-header.module.css";

const navigation = [
  { href: "/", label: "Inici" },
  { href: "/rutas", label: "Rutes" },
  { href: "/carrera-ciclista", label: "Carrera ciclista" },
  { href: "/equipaciones", label: "Equipacions" },
  { href: "/login", label: "Accés", isPill: true },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className={styles.header}>
      <div className="container">
        <div className={styles.inner}>
          <Link href="/" className={styles.brand}>
            <span className={styles.brandMark}>PC</span>
            <span className={styles.brandText}>
              <strong>Club Ciclista</strong>
              <span>Rutes, carrera i equipacions</span>
            </span>
          </Link>

          <button
            type="button"
            className={styles.toggle}
            onClick={() => setIsOpen((value) => !value)}
            aria-expanded={isOpen}
            aria-controls="main-navigation"
          >
            <span>{isOpen ? "Tancar" : "Menú"}</span>
            <span className={styles.toggleIcon} aria-hidden="true">
              {isOpen ? "×" : "☰"}
            </span>
          </button>

          <nav
            id="main-navigation"
            className={`${styles.nav} ${isOpen ? styles.navOpen : ""}`}
          >
            {navigation.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.link} ${item.isPill ? styles.linkPill : ""} ${
                    active ? styles.linkActive : ""
                  }`}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
