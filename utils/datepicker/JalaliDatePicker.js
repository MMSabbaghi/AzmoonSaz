/**
 * JalaliDatePicker - انتخاب‌گر تاریخ و زمان شمسی
 */
(function (global) {
  const SHAMSI_MONTHS = [
    "فروردین",
    "اردیبهشت",
    "خرداد",
    "تیر",
    "مرداد",
    "شهریور",
    "مهر",
    "آبان",
    "آذر",
    "دی",
    "بهمن",
    "اسفند",
  ];

  function toPersianDigits(num) {
    if (num === undefined || num === null) return "";
    const id = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
    return num.toString().replace(/[0-9]/g, (w) => id[+w]);
  }

  function getMonthMaxDay(month, year) {
    if (month < 1 || month > 12) return 31;
    if (month <= 6) return 31;
    if (month <= 11) return 30;
    return jalaali.isLeapJalaaliYear(year) ? 30 : 29;
  }

  function jalaliToGregorianDate(jy, jm, jd, hour = 0, minute = 0) {
    const g = jalaali.toGregorian(jy, jm, jd);
    return new Date(g.gy, g.gm - 1, g.gd, hour, minute);
  }

  function getCurrentJalali() {
    const now = new Date();
    const j = jalaali.toJalaali(
      now.getFullYear(),
      now.getMonth() + 1,
      now.getDate(),
    );
    return {
      jy: j.jy,
      jm: j.jm,
      jd: j.jd,
      hour: now.getHours(),
      minute: now.getMinutes(),
    };
  }

  const instances = new WeakMap();

  class JalaliDatePicker {
    constructor(container, options = {}) {
      if (!container || !(container instanceof HTMLElement)) {
        throw new Error("JalaliDatePicker: container باید یک عنصر DOM باشد");
      }

      this.container = container;
      this.options = {
        minYearOffset: options.minYearOffset ?? -20,
        maxYearOffset: options.maxYearOffset ?? 0,
        onChange:
          typeof options.onChange === "function" ? options.onChange : null,
        persianDigits: options.persianDigits !== false,
      };

      // المان‌های تاریخ و زمان
      this.yearSelect = container.querySelector("[data-dp-year]");
      this.monthSelect = container.querySelector("[data-dp-month]");
      this.daySelect = container.querySelector("[data-dp-day]");
      this.hourSelect = container.querySelector("[data-dp-hour]"); // new
      this.minuteSelect = container.querySelector("[data-dp-minute]"); // new

      if (!this.yearSelect && !this.monthSelect && !this.daySelect) {
        throw new Error(
          "JalaliDatePicker: حداقل یکی از selectهای تاریخ باید وجود داشته باشد",
        );
      }

      this.currentYear = null;
      this.currentMonth = null;
      this.currentDay = null;
      this.currentHour = null;
      this.currentMinute = null;

      this._init();
    }

    _init() {
      this._populateYears();
      this._populateMonths();
      this._populateHours(); // new
      this._populateMinutes(); // new

      if (this.daySelect) {
        this._updateDays(false);
      } else {
        this._readCurrentValues();
      }

      // event listeners
      if (this.yearSelect)
        this.yearSelect.addEventListener("change", () =>
          this._onYearMonthChange(),
        );
      if (this.monthSelect)
        this.monthSelect.addEventListener("change", () =>
          this._onYearMonthChange(),
        );
      if (this.daySelect)
        this.daySelect.addEventListener("change", () => this._onDayChange());
      if (this.hourSelect)
        this.hourSelect.addEventListener("change", () => this._onTimeChange());
      if (this.minuteSelect)
        this.minuteSelect.addEventListener("change", () =>
          this._onTimeChange(),
        );

      this._readCurrentValues();
    }

    _populateYears() {
      if (!this.yearSelect) return;
      const { minYearOffset, maxYearOffset } = this.options;
      const currentJ = getCurrentJalali();
      const minYear = currentJ.jy + minYearOffset;
      const maxYear = currentJ.jy + maxYearOffset;
      this.yearSelect.innerHTML = "";
      for (let y = maxYear; y >= minYear; y--) {
        const option = document.createElement("option");
        option.value = y;
        option.textContent = this.options.persianDigits
          ? toPersianDigits(y)
          : y;
        if (y === currentJ.jy) option.selected = true;
        this.yearSelect.appendChild(option);
      }
    }

    _populateMonths() {
      if (!this.monthSelect) return;
      this.monthSelect.innerHTML = "";
      SHAMSI_MONTHS.forEach((name, idx) => {
        const option = document.createElement("option");
        option.value = idx + 1;
        option.textContent = this.options.persianDigits
          ? toPersianDigits(name)
          : name;
        this.monthSelect.appendChild(option);
      });
      const currentJ = getCurrentJalali();
      if (this.monthSelect.options.length >= currentJ.jm) {
        this.monthSelect.value = currentJ.jm;
      }
    }

    _populateHours() {
      if (!this.hourSelect) return;
      this.hourSelect.innerHTML = "";
      for (let h = 0; h <= 23; h++) {
        const option = document.createElement("option");
        option.value = h;
        option.textContent = this.options.persianDigits
          ? toPersianDigits(h)
          : h;
        this.hourSelect.appendChild(option);
      }
      // مقدار پیش‌فرض: ساعت جاری
      const currentJ = getCurrentJalali();
      this.hourSelect.value = currentJ.hour;
    }

    _populateMinutes() {
      if (!this.minuteSelect) return;
      this.minuteSelect.innerHTML = "";
      for (let m = 0; m <= 59; m++) {
        const option = document.createElement("option");
        option.value = m;
        option.textContent = this.options.persianDigits
          ? toPersianDigits(m)
          : m;
        this.minuteSelect.appendChild(option);
      }
      const currentJ = getCurrentJalali();
      this.minuteSelect.value = currentJ.minute;
    }

    _updateDays(triggerOnChange = true) {
      if (!this.daySelect) return;
      const year = this._getSelectedYear();
      const month = this._getSelectedMonth();
      if (!year || !month) {
        this.daySelect.disabled = true;
        this.daySelect.innerHTML = '<option value="">روز</option>';
        return;
      }
      const maxDay = getMonthMaxDay(month, year);
      const selectedDay = this._getSelectedDay();
      let newDay = selectedDay && selectedDay <= maxDay ? selectedDay : 1;

      this.daySelect.disabled = false;
      this.daySelect.innerHTML = "";
      for (let d = 1; d <= maxDay; d++) {
        const option = document.createElement("option");
        option.value = d;
        option.textContent = this.options.persianDigits
          ? toPersianDigits(d)
          : d;
        if (d === newDay) option.selected = true;
        this.daySelect.appendChild(option);
      }
      this.currentDay = newDay;
      if (triggerOnChange && this.options.onChange) {
        const date = this.getDate();
        if (date) this.options.onChange(date);
      }
    }

    _readCurrentValues() {
      this.currentYear = this._getSelectedYear();
      this.currentMonth = this._getSelectedMonth();
      this.currentDay = this._getSelectedDay();
      this.currentHour = this._getSelectedHour();
      this.currentMinute = this._getSelectedMinute();
    }

    _getSelectedYear() {
      return this.yearSelect
        ? parseInt(this.yearSelect.value, 10) || null
        : null;
    }
    _getSelectedMonth() {
      return this.monthSelect
        ? parseInt(this.monthSelect.value, 10) || null
        : null;
    }
    _getSelectedDay() {
      return this.daySelect ? parseInt(this.daySelect.value, 10) || null : null;
    }
    _getSelectedHour() {
      if (!this.hourSelect) return null;
      const v = parseInt(this.hourSelect.value, 10);
      return isNaN(v) ? null : v;
    }
    _getSelectedMinute() {
      if (!this.minuteSelect) return null;
      const v = parseInt(this.minuteSelect.value, 10);
      return isNaN(v) ? null : v;
    }

    _onYearMonthChange() {
      this._readCurrentValues();
      if (this.daySelect) {
        this._updateDays(true);
      } else {
        if (this.options.onChange) this.options.onChange(this.getDate());
      }
    }

    _onDayChange() {
      this._readCurrentValues();
      if (this.options.onChange) this.options.onChange(this.getDate());
    }

    _onTimeChange() {
      this._readCurrentValues();
      if (this.options.onChange) this.options.onChange(this.getDate());
    }

    // API
    getJalali() {
      const year = this._getSelectedYear();
      const month = this._getSelectedMonth();
      const day = this._getSelectedDay();
      if (year === null || month === null) return null;
      if (this.daySelect && day === null) return null;
      const finalDay = this.daySelect ? day : 1;
      if (finalDay === null) return null;

      const result = { jy: year, jm: month, jd: finalDay };
      if (this.hourSelect) result.hour = this._getSelectedHour() ?? 0;
      if (this.minuteSelect) result.minute = this._getSelectedMinute() ?? 0;
      return result;
    }

    getDate() {
      const jalali = this.getJalali();
      if (!jalali) return null;
      const hour = this.hourSelect ? (jalali.hour ?? 0) : 0;
      const minute = this.minuteSelect ? (jalali.minute ?? 0) : 0;
      return jalaliToGregorianDate(
        jalali.jy,
        jalali.jm,
        jalali.jd,
        hour,
        minute,
      );
    }

    setDate(jy, jm, jd, hour, minute) {
      if (!jy || !jm) return false;
      if (this.daySelect && !jd) return false;

      const currentJ = getCurrentJalali();
      const minYear = currentJ.jy + this.options.minYearOffset;
      const maxYear = currentJ.jy + this.options.maxYearOffset;
      if (jy < minYear || jy > maxYear) return false;
      if (jm < 1 || jm > 12) return false;

      const maxDay = getMonthMaxDay(jm, jy);
      if (this.daySelect && (jd < 1 || jd > maxDay)) return false;

      if (this.yearSelect) this.yearSelect.value = jy;
      if (this.monthSelect) this.monthSelect.value = jm;
      if (this.daySelect) {
        this._updateDays(false);
        if (this.daySelect.querySelector(`option[value="${jd}"]`)) {
          this.daySelect.value = jd;
        } else return false;
      }
      if (this.hourSelect && hour !== undefined) {
        if (hour < 0 || hour > 23) return false;
        this.hourSelect.value = hour;
      }
      if (this.minuteSelect && minute !== undefined) {
        if (minute < 0 || minute > 59) return false;
        this.minuteSelect.value = minute;
      }

      this._readCurrentValues();
      if (this.options.onChange) this.options.onChange(this.getDate());
      return true;
    }

    setDateFromGregorian(date) {
      if (!(date instanceof Date) || isNaN(date.getTime())) return false;
      const j = jalaali.toJalaali(
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate(),
      );
      return this.setDate(j.jy, j.jm, j.jd, date.getHours(), date.getMinutes());
    }

    resetToToday() {
      const today = getCurrentJalali();
      return this.setDate(
        today.jy,
        today.jm,
        today.jd,
        today.hour,
        today.minute,
      );
    }

    destroy() {
      if (this.yearSelect)
        this.yearSelect.removeEventListener("change", this._onYearMonthChange);
      if (this.monthSelect)
        this.monthSelect.removeEventListener("change", this._onYearMonthChange);
      if (this.daySelect)
        this.daySelect.removeEventListener("change", this._onDayChange);
      if (this.hourSelect)
        this.hourSelect.removeEventListener("change", this._onTimeChange);
      if (this.minuteSelect)
        this.minuteSelect.removeEventListener("change", this._onTimeChange);
      instances.delete(this.container);
    }

    static ensure(container, options = {}) {
      if (!(container instanceof HTMLElement))
        throw new Error("container باید یک عنصر DOM باشد");
      let instance = instances.get(container);
      if (!instance) {
        instance = new JalaliDatePicker(container, options);
        instances.set(container, instance);
      }
      return instance;
    }
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = JalaliDatePicker;
  } else {
    global.JalaliDatePicker = JalaliDatePicker;
  }
})(typeof window !== "undefined" ? window : this);
