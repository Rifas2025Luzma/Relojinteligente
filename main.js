import './style.css';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue } from "firebase/database";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA7irjSjANGeY4iZe80ZuOo_pr3aBhFi5s",
  authDomain: "rifa-smart-watch.firebaseapp.com",
  databaseURL: "https://rifa-smart-watch-default-rtdb.firebaseio.com",
  projectId: "rifa-smart-watch",
  storageBucket: "rifa-smart-watch.appspot.com",
  messagingSenderId: "916262944799",
  appId: "1:916262944799:web:8198492c24022ae398952a",
  measurementId: "G-YWMZ995XRK"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

class RaffleApp {
  constructor() {
    this.participants = {};
    this.selectedNumber = null;
    this.pendingRegistrations = [];
    this.initializeApp();
    this.setupFirebaseListener();
  }

  initializeApp() {
    this.renderApp();
    this.setupEventListeners();
  }

  setupFirebaseListener() {
    const rifaRef = ref(database, 'rifa');
    onValue(rifaRef, (snapshot) => {
      const data = snapshot.val();
      this.participants = data || {};
      this.renderApp();
      this.setupEventListeners();
    });
  }

  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      alert('¡Número copiado al portapapeles!');
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  }

  maskName(fullName) {
    const names = fullName.trim().split(' ');
    if (names.length === 1) {
      return names[0];
    }
    const firstName = names[0];
    const secondInitial = names[1] ? names[1][0] + '.' : '';
    return `${firstName} ${secondInitial}${'*'.repeat(5)}`;
  }

  maskPhone(phone) {
    return phone.substring(0, 5) + '*'.repeat(Math.max(0, phone.length - 5));
  }

  async saveParticipant(number, name, phone) {
    try {
      await set(ref(database, `rifa/${number}`), {
        name: name,
        phone: phone,
        timestamp: Date.now()
      });
      return true;
    } catch (error) {
      console.error("Error guardando participante:", error);
      return false;
    }
  }

  async confirmPendingRegistrations() {
    const button = document.getElementById('confirmButton');
    if (button) {
      button.disabled = true;
      button.textContent = 'Guardando...';
    }

    const successfulRegistrations = [];
    const failedRegistrations = [];

    for (const registration of this.pendingRegistrations) {
      try {
        const success = await this.saveParticipant(
          registration.number,
          registration.name,
          registration.phone
        );

        if (success) {
          successfulRegistrations.push(registration.number);
        } else {
          failedRegistrations.push(registration.number);
        }
      } catch (error) {
        console.error(`Error al guardar número ${registration.number}:`, error);
        failedRegistrations.push(registration.number);
      }
    }

    // Limpiar registros pendientes solo después de guardar
    this.pendingRegistrations = failedRegistrations.map(number => 
      this.pendingRegistrations.find(reg => reg.number === number)
    );

    if (failedRegistrations.length > 0) {
      alert(`Error al guardar los números: ${failedRegistrations.join(', ')}`);
    }

    if (successfulRegistrations.length > 0) {
      alert(`Números registrados exitosamente: ${successfulRegistrations.join(', ')}`);
    }

    // Restablecer el estado del botón y renderizar
    if (button) {
      button.disabled = false;
      button.textContent = 'Confirmar Registros';
    }

    this.selectedNumber = null;
    this.renderApp();
    this.setupEventListeners();
  }

  addPendingRegistration(number, name, phone) {
    if (!name.trim() || !phone.trim()) {
      alert('Por favor complete todos los campos');
      return;
    }

    if (this.participants[number]) {
      alert('Este número ya está registrado');
      return;
    }

    if (this.pendingRegistrations.some(reg => reg.number === number)) {
      alert('Este número ya está pendiente de registro');
      return;
    }

    this.pendingRegistrations.push({
      number,
      name: name.trim(),
      phone: phone.trim(),
      timestamp: Date.now()
    });

    this.renderApp();
    this.setupEventListeners();
  }

  renderApp() {
    const appElement = document.querySelector('#app');
    if (!appElement) return;

    appElement.innerHTML = `
      <div class="container">
        <header class="header">
          <h1>¡Gran Rifa de $1'000.000!</h1>
          <p>Sorteo: 20 de septiembre con los últimos dos números de la Lotería de Boyacá</p>
          <img src="https://images.pexels.com/photos/259027/pexels-photo-259027.jpeg?auto=compress&cs=tinysrgb&w=300" 
               alt="Dinero" 
               class="smartwatch-image">
        </header>
        
        <div class="numbers-grid">
          ${this.generateNumbersGrid()}
        </div>

        <div class="payment-info">
          <p class="copy-number" data-number="3002183503">PUEDES PAGAR POR NEQUI AL NÚMERO <span class="number-highlight">3002183503</span> <span class="copy-icon">📋</span></p>
        </div>

        <div class="modal" id="registrationModal">
          <div class="modal-content">
            <h2>Registrar Número ${this.selectedNumber !== null ? this.selectedNumber.toString().padStart(2, '0') : ''}</h2>
            <form id="registrationForm">
              <div class="form-group">
                <label for="name">Nombre:</label>
                <input type="text" id="name" required>
              </div>
              <div class="form-group">
                <label for="phone">Teléfono:</label>
                <input type="tel" id="phone" required>
              </div>
              <button type="submit" class="button">Agregar</button>
            </form>
          </div>
        </div>

        <div class="participants-list">
          <h2>Números Registrados</h2>
          <table class="participants-table">
            <thead>
              <tr>
                <th>Número</th>
                <th>Nombre</th>
                <th>Teléfono</th>
              </tr>
            </thead>
            <tbody>
              ${this.generateParticipantsList()}
            </tbody>
          </table>
          
          ${this.pendingRegistrations.length > 0 ? `
            <div class="pending-registrations">
              <h3>Registros Pendientes de Confirmación</h3>
              <table class="participants-table">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Nombre</th>
                    <th>Teléfono</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.pendingRegistrations.map(reg => `
                    <tr>
                      <td>${reg.number}</td>
                      <td>${this.maskName(reg.name)}</td>
                      <td>${this.maskPhone(reg.phone)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              <button id="confirmButton" class="button confirm-button">
                Confirmar Registros (${this.pendingRegistrations.length})
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  generateNumbersGrid() {
    let grid = '';
    for (let i = 0; i < 100; i++) {
      const number = i.toString().padStart(2, '0');
      const isSelected = this.participants[number] !== undefined;
      const isPending = this.pendingRegistrations.some(reg => reg.number === number);
      grid += `
        <div class="number-cell ${isSelected ? 'selected' : ''} ${isPending ? 'pending' : ''}" 
             data-number="${number}">
          ${number}
        </div>
      `;
    }
    return grid;
  }

  generateParticipantsList() {
    return Object.entries(this.participants)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([number, data]) => `
        <tr>
          <td>${number}</td>
          <td>${this.maskName(data.name)}</td>
          <td>${this.maskPhone(data.phone)}</td>
        </tr>
      `).join('');
  }

  setupEventListeners() {
    // Configurar el evento de copiar número
    const copyNumberElement = document.querySelector('.copy-number');
    if (copyNumberElement) {
      copyNumberElement.addEventListener('click', () => {
        const number = copyNumberElement.dataset.number;
        this.copyToClipboard(number);
      });
    }

    // Remover listeners anteriores
    const oldConfirmButton = document.getElementById('confirmButton');
    if (oldConfirmButton) {
      oldConfirmButton.replaceWith(oldConfirmButton.cloneNode(true));
    }

    // Configurar nuevo listener para el botón de confirmar
    const confirmButton = document.getElementById('confirmButton');
    if (confirmButton) {
      confirmButton.addEventListener('click', () => this.confirmPendingRegistrations());
    }

    const modal = document.querySelector('#registrationModal');
    const form = document.querySelector('#registrationForm');

    // Configurar listeners para las celdas de números
    document.querySelectorAll('.number-cell').forEach(cell => {
      cell.addEventListener('click', (e) => {
        const number = e.target.dataset.number;
        if (!this.participants[number] && !this.pendingRegistrations.some(reg => reg.number === number)) {
          this.selectedNumber = number;
          if (modal) {
            modal.classList.add('active');
            if (form) form.reset();
          }
        }
      });
    });

    // Configurar listener para el formulario
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const nameInput = document.querySelector('#name');
        const phoneInput = document.querySelector('#phone');
        
        if (nameInput && phoneInput) {
          this.addPendingRegistration(this.selectedNumber, nameInput.value, phoneInput.value);
          if (modal) modal.classList.remove('active');
          form.reset();
        }
      });
    }

    // Configurar listener para cerrar el modal
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
        }
      });
    }
  }
}

// Inicializar la aplicación
new RaffleApp();