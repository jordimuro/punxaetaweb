"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { HeaderAuthControl } from "./auth";
import styles from "./site-header.module.css";

const navigation = [
  { href: "/", label: "Inici" },
  { href: "/rutas", label: "Rutes" },
  { href: "/carrera-ciclista", label: "Trofeu Vila de Muro-Punxaeta" },
  { href: "/equipaciones", label: "Equipacions" },
  { href: "/contacte", label: "Contacte" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className={styles.header}>
      <div className="container">
        <div className={styles.inner}>
          <Link href="/" className={styles.brand}>
            <span className={styles.brandMark} aria-hidden="true">
              <Image
                src="/logo.jpg"
                alt=""
                fill
                sizes="64px"
                priority
                className={styles.brandMarkImage}
              />
            </span>
            <span className={styles.brandText}>
              <strong>CC La Punxaeta</strong>
              <span>Muro</span>
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
                  className={`${styles.link} ${active ? styles.linkActive : ""}`}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
            <HeaderAuthControl
              className={`${styles.authControl} ${styles.linkPill}`}
              onNavigate={() => setIsOpen(false)}
            />
          </nav>
        </div>
      </div>
    </header>
  );
}
