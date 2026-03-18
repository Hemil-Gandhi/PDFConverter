import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {
  menuOpen = false;
  toolsOpen = false;

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  toggleTools() {
    this.toolsOpen = !this.toolsOpen;
  }

  closeAll() {
    this.menuOpen = false;
    this.toolsOpen = false;
  }
}
