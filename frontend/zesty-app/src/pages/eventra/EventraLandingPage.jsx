import React from 'react';
import { Link } from 'react-router-dom';

const EventraLandingPage = () => {
  return (
    <div className="theme-eventra eventra-scrollbar selection:bg-eventra-primary-fixed selection:text-eventra-on-primary-fixed bg-eventra-background min-h-screen text-eventra-on-surface font-eventra-body">
      

<nav className="bg-[#fbf8fe]/60 dark:bg-[#1c1b1f]/60 backdrop-blur-xl docked full-width top-0 sticky z-50 shadow-[0px_12px_32px_0px_rgba(84,38,228,0.06)]">
<div className="flex justify-between items-center w-full px-8 py-4 max-w-[1440px] mx-auto">
<div className="flex items-center gap-8">
<span className="text-2xl font-black text-[#5426e4] dark:text-[#d0bcff] italic font-eventra-headline">Eventra</span>
<div className="hidden lg:flex items-center gap-6 font-eventra-label text-sm font-medium">
<a className="text-[#5426e4] dark:text-[#d0bcff] font-bold border-b-2 border-[#5426e4] pb-1" href="javascript:void(0)">For you</a>
<a className="text-[#49454f] dark:text-[#cac4d0] hover:text-[#5426e4] hover:bg-[#f5f3f9] dark:hover:bg-[#49454f] transition-all duration-300 px-2 py-1 rounded-lg" href="javascript:void(0)">Dining</a>
<a className="text-[#49454f] dark:text-[#cac4d0] hover:text-[#5426e4] hover:bg-[#f5f3f9] dark:hover:bg-[#49454f] transition-all duration-300 px-2 py-1 rounded-lg" href="javascript:void(0)">Movies</a>
<a className="text-[#49454f] dark:text-[#cac4d0] hover:text-[#5426e4] hover:bg-[#f5f3f9] dark:hover:bg-[#49454f] transition-all duration-300 px-2 py-1 rounded-lg" href="javascript:void(0)">Events</a>
<a className="text-[#49454f] dark:text-[#cac4d0] hover:text-[#5426e4] hover:bg-[#f5f3f9] dark:hover:bg-[#49454f] transition-all duration-300 px-2 py-1 rounded-lg" href="javascript:void(0)">IPL</a>
<a className="text-[#49454f] dark:text-[#cac4d0] hover:text-[#5426e4] hover:bg-[#f5f3f9] dark:hover:bg-[#49454f] transition-all duration-300 px-2 py-1 rounded-lg" href="javascript:void(0)">Stores</a>
</div>
</div>
<div className="flex items-center gap-6">
<div className="flex items-center gap-2 px-4 py-2 bg-eventra-surface-container rounded-full cursor-pointer hover:bg-eventra-surface-container-high transition-colors">
<span className="material-symbols-outlined text-eventra-primary text-xl">location_on</span>
<span className="font-eventra-label text-xs font-semibold">New Delhi</span>
</div>
<div className="flex items-center gap-4">
<span className="material-symbols-outlined text-eventra-on-surface-variant cursor-pointer hover:text-eventra-primary transition-colors">search</span>
<span className="material-symbols-outlined text-eventra-on-surface-variant cursor-pointer hover:text-eventra-primary transition-colors">account_circle</span>
</div>
</div>
</div>
</nav>
<main className="space-y-24 pb-20">

<section className="max-w-[1440px] mx-auto px-8 pt-8">
<div className="flex justify-between items-end mb-8">
<div>
<span className="text-eventra-primary font-bold font-eventra-label uppercase tracking-widest text-xs">Live Action</span>
<h2 className="text-4xl font-black font-eventra-headline tracking-tighter mt-1">TATA IPL 2026</h2>
</div>
<button className="text-eventra-primary font-bold font-eventra-label flex items-center gap-1 hover:gap-2 transition-all">View Schedule <span className="material-symbols-outlined">chevron_right</span></button>
</div>
<div className="flex gap-6 overflow-x-auto hide-scrollbar snap-x snap-mandatory pb-4">

<div className="min-w-[400px] bg-eventra-surface-container-lowest rounded-3xl snap-start p-6 shadow-[0px_12px_32px_0px_rgba(84,38,228,0.04)] hover:scale-105 transition-transform duration-300">
<div className="flex justify-between items-start mb-6">
<div className="bg-eventra-primary/10 text-eventra-primary px-3 py-1 rounded-full text-xs font-bold font-eventra-label">Match 14</div>
<span className="text-eventra-on-surface-variant text-sm font-eventra-label">Mar 28 • 19:30</span>
</div>
<div className="flex justify-between items-center mb-8">
<div className="text-center w-1/3">
<div className="w-16 h-16 mx-auto mb-2 bg-eventra-surface-container rounded-full flex items-center justify-center">
<img alt="MI" className="w-10" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBT0SLhQV-VjyaLzl-pwDupqlSNLUfRJlQlMzBb3uBzYxp2eA-dLs2hD9LEGzsbHk6I3CWWRgyz4LRH0rNGvqPs5aZ3orOArHBm5wfIam_gART_OgKXo5szbXv5nrnQixPFcvwu18XWfc9eyeNNOT2wB0wxt31cIrSvbDZkhYvI4Gy3WJDlCQNXyw1iQivSYgxzS4HprjhqPHCRofVS_8fNHVC2HmjPuszEOqeGsabzuIYZf3gy2EDf0XXm3V-PYq7y3FtYl_kHrw"/>
</div>
<span className="font-bold text-sm">Mumbai</span>
</div>
<div className="text-eventra-on-surface-variant font-black text-xl italic">VS</div>
<div className="text-center w-1/3">
<div className="w-16 h-16 mx-auto mb-2 bg-eventra-surface-container rounded-full flex items-center justify-center">
<img alt="RCB" className="w-10" src="https://lh3.googleusercontent.com/aida-public/AB6AXuApUe-vWO6SpohfeeJS0TDDvTsTtlcChsg-i7id99A1JtDckHmYVfvrpcAPAmo9dQVzFewX_lqM7gEFF8x_O-6hxxKVzhpxcXjom-Vw2CTPzHadm5UVRjXUVYotkeJyBicw2Whlh-gIx-Zr033PJ638OlWS-aKx4LbJuYIDwGC0kT23PtlbVBgr4a7qFc0ax-0SyGmgOQ8839DnuPQhErA02d7dGLR7cmn0xXDCHUaZrFDICjcbmOzP60UPP1j9NcBgERdwWKDBZg"/>
</div>
<span className="font-bold text-sm">Bengaluru</span>
</div>
</div>
<div className="flex justify-between items-center pt-4 border-t border-eventra-outline-variant/20">
<span className="font-eventra-label font-bold text-lg">From ₹999</span>
<Link to="/eventra/seats/cinema-enhanced"><button className="bg-eventra-primary text-eventra-on-primary px-6 py-2 rounded-xl font-bold font-eventra-label text-sm hover:scale-105 active:scale-95 transition-transform">Book Now</button></Link>
</div>
</div>

<div className="min-w-[400px] bg-eventra-surface-container-lowest rounded-3xl snap-start p-6 shadow-[0px_12px_32px_0px_rgba(84,38,228,0.04)] hover:scale-105 transition-transform duration-300">
<div className="flex justify-between items-start mb-6">
<div className="bg-eventra-primary/10 text-eventra-primary px-3 py-1 rounded-full text-xs font-bold font-eventra-label">Match 17</div>
<span className="text-eventra-on-surface-variant text-sm font-eventra-label">Mar 30 • 19:30</span>
</div>
<div className="flex justify-between items-center mb-8">
<div className="text-center w-1/3">
<div className="w-16 h-16 mx-auto mb-2 bg-eventra-surface-container rounded-full flex items-center justify-center">
<img alt="CSK" className="w-10" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC9YAPIW0_e7F6Gh10zeoW5aK2FQnUCsSiPo9BJR94lo-sDKK5uN7fr4hDoS4qTqqJssW3pCs92144z5HWMOTGsTYGpksJVFhDDLS1j0CcOIvvZMN3k6dFxpW5dLoLiAUHP_SHb2WCnDQE2kCspsACBoyrh5lbxORF03onA8JlgbctCSIM8ZAt9KYmucjEpG6UmZf4BE4jJmZEotGnl9QGbE6hSH54rl8Kuk3ENR3M0niuomiJihfKhbj7VyHy7N7BcwELy4HMHOA"/>
</div>
<span className="font-bold text-sm">Chennai</span>
</div>
<div className="text-eventra-on-surface-variant font-black text-xl italic">VS</div>
<div className="text-center w-1/3">
<div className="w-16 h-16 mx-auto mb-2 bg-eventra-surface-container rounded-full flex items-center justify-center">
<img alt="GT" className="w-10" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAPUAZ9XH9oaYcn9_7fmV1FoGzmljVQk2-i8l8L0q07CD2bdNiKyOBQMWKSTXqafsX4FUtAs3wdZA0cNr0SZao8bRGMSGHzl7nPzABsIRD5bVccj4sNLR5J-ArLLYUzKTlFJt0sr4_Gwi882Oq5WaZ4XKcjKvqwIiKVYl9JrmCB27Dd6A_CUjZtxT1PeL_VOZ_e4yoPOXJpPaBLFtDUXyx5VMr3qYbHFS6F-cwDD0gvyyhHcFFI4mew0W2Ny_ufUYLzX-3SWDhkNw"/>
</div>
<span className="font-bold text-sm">Gujarat</span>
</div>
</div>
<div className="flex justify-between items-center pt-4 border-t border-eventra-outline-variant/20">
<span className="font-eventra-label font-bold text-lg">From ₹1,200</span>
<Link to="/eventra/seats/concert-enhanced"><button className="bg-eventra-primary text-eventra-on-primary px-6 py-2 rounded-xl font-bold font-eventra-label text-sm hover:scale-105 active:scale-95 transition-transform">Book Now</button></Link>
</div>
</div>

<div className="min-w-[400px] bg-eventra-surface-container-lowest rounded-3xl snap-start p-6 shadow-[0px_12px_32px_0px_rgba(84,38,228,0.04)] opacity-60">
<div className="flex justify-between items-start mb-6">
<div className="bg-eventra-primary/10 text-eventra-primary px-3 py-1 rounded-full text-xs font-bold font-eventra-label">Match 21</div>
<span className="text-eventra-on-surface-variant text-sm font-eventra-label">Apr 02 • 15:30</span>
</div>
</div>
</div>
</section>

<section className="max-w-[1440px] mx-auto px-8">
<h2 className="text-3xl font-black font-eventra-headline tracking-tighter mb-8">Top Hindi Movies</h2>
<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">

<div className="group cursor-pointer">
<div className="aspect-[2/3] bg-eventra-surface-container rounded-3xl overflow-hidden mb-4 shadow-sm group-hover:shadow-xl transition-all duration-300">
<img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" data-alt="dramatic action movie poster with a silhouetted hero standing against an orange explosion and debris" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAYKUuo09Hm_B8mK5Q96BTF9akFewOCjs1-h-OSC6Zl-CX9rthxZ_bD5RSFZakbmRxjYm1FMy9JQ00pVAVAmKjgGj8FVwybUqw_IbL2n2ylXpLKUPKpWeeI2YJRqS1St4c2lDkOjH5dXPS8XsZYSsg0iZhjxkjyb3U4s6iQlIVqFeZqfLW-yQo_VASy2KEtNdtBwoIv00hRe2QYShsyH7M1fvOWg42jC8xnw-faBPIRvMTIOtOcRl2nKzx86AtgQMjJucnw0ZBznw"/>
</div>
<h3 className="font-bold font-eventra-headline text-lg leading-tight">Dhurandhar: The Revenge</h3>
<p className="font-eventra-label text-eventra-on-surface-variant text-sm mt-1">Action • UA • 2h 45m</p>
</div>

<div className="group cursor-pointer">
<div className="aspect-[2/3] bg-eventra-surface-container rounded-3xl overflow-hidden mb-4 shadow-sm group-hover:shadow-xl transition-all duration-300">
<img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" data-alt="vibrant animated movie poster featuring colorful forest and magical glowing creatures in a dreamy landscape" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBsXrFL2YoIhunLapQ4PpIrwI-K_F07vleSbX9QjnIEYUQ5qYvqNH-efuJcQdK84_X2JGAt9jyZCMHapaVchhojvjuQ1CiTkWve_HrF5qDq1Y22hpQj8LXsxOyDYATxokfTTo5y2A9C1S5lWR2vZWQffm_Azkq0dI5fEG_4A5SYfDxvwXjiy7gvq6me6FFqi5aNt3WOWj_7Utfgbo8NbdgwXenuWj3CqvYntBsIBaWaOuKNuO_0xAHvi670OnTR6G9sWDpUc5Bb9Q"/>
</div>
<h3 className="font-bold font-eventra-headline text-lg leading-tight">Zootopia 2</h3>
<p className="font-eventra-label text-eventra-on-surface-variant text-sm mt-1">Animation • U • 1h 52m</p>
</div>

<div className="group cursor-pointer">
<div className="aspect-[2/3] bg-eventra-surface-container rounded-3xl overflow-hidden mb-4 shadow-sm group-hover:shadow-xl transition-all duration-300">
<img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" data-alt="cinematic movie poster of a space station orbiting a giant ringed planet with nebula clouds" src="https://lh3.googleusercontent.com/aida-public/AB6AXuChM2T23s3n46WCGjpvqdUTgKX3FseVOkMPF4ntqWL6cFNF2CpqSFve1qj8BvgOd3Tg0xomckQh5bYDxVP1kk8O_i0p7Xrsls9oahIz-TCSqUOz66JqW-OvF7f6FsUSWNSl2PzgSMelSNpobyh7pJdgHsekpROhKJlzG2YjiRCqXW-H7NB0n4xLzxjzwi35uM8iBPkdlor7HImSFTOdogPl2P1ZAoh7xi71rLNNMJKX6jnjyRS9nxd_PwWl6lQmmA_pyYP9VPssNQ"/>
</div>
<h3 className="font-bold font-eventra-headline text-lg leading-tight">Voyage Beyond</h3>
<p className="font-eventra-label text-eventra-on-surface-variant text-sm mt-1">Sci-Fi • UA • 2h 10m</p>
</div>

<div className="group cursor-pointer">
<div className="aspect-[2/3] bg-eventra-surface-container rounded-3xl overflow-hidden mb-4 shadow-sm group-hover:shadow-xl transition-all duration-300">
<img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" data-alt="black and white artistic movie poster with high contrast lighting and a single red object on a chair" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAfmOajS37HLL9elKl_UwCUL_py3-BrECwb4X9rlD7AzeQlcYKqTkhvNB4Z7htzbvBVFWGrB2FygEK0thXn4t65SeAEfIe6OShlEvgxp9PckzG_M1HrgIISAsG70uPY0JhD0x3izxR9EMQ74NrLSBjuB6febus-aalhxPLalMLsZGFnkiasSDtgf8A-Iqb_3H6bVTOAH9OeVb7e0G_ThBeDJr5arfjruc2DFhHsGxLHCKVQ8FwmJvWLbPrtpZaFLQhRfxY0lt6ZiA"/>
</div>
<h3 className="font-bold font-eventra-headline text-lg leading-tight">The Silent Echo</h3>
<p className="font-eventra-label text-eventra-on-surface-variant text-sm mt-1">Drama • A • 2h 20m</p>
</div>

<div className="hidden lg:block group cursor-pointer">
<div className="aspect-[2/3] bg-eventra-surface-container rounded-3xl overflow-hidden mb-4 shadow-sm group-hover:shadow-xl transition-all duration-300">
<img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" data-alt="mysterious thriller poster with a foggy street lamp at night and a shadow of a person walking away" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCPuWOEj9SObFhRgkA_HqGBhCGo9XfsSCp0jp1ai5HFqgYl1fIPcvyzxiANFa9LfkbzZNR8HiCBKSGkYt0G5ZuLBRqsK-__E79VHr7er06RzXISvB-hFG9NP-D3-Cqd6_6d3tzjXvb5a-aOb45ZURXTQoSbol-QwSov-k5GP-5UAdeUQ7asYyMsc4CVzBJN2xK8YGKSXjiJtONP-gwFp-4FkNLLZJkYrdvc278QRdTrjAhiWBj5dER822yDtJvtm5wOgOq1rnAqlQ"/>
</div>
<h3 className="font-bold font-eventra-headline text-lg leading-tight">Midnight Shadows</h3>
<p className="font-eventra-label text-eventra-on-surface-variant text-sm mt-1">Thriller • UA • 1h 55m</p>
</div>
</div>
</section>

<section className="bg-eventra-surface-container-low py-20">
<div className="max-w-[1440px] mx-auto px-8">
<h2 className="text-3xl font-black font-eventra-headline tracking-tighter mb-10">Crowd Favourite Activities</h2>
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">

<div className="relative h-[400px] rounded-[2rem] overflow-hidden group">
<img className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" data-alt="blurred motion of a colorful go-kart racing on an asphalt track with bright outdoor lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBJFf4nnbIqHJlkKIXEKfvDecAiX1xPRELtKuZQp0B4Gtj_R0At-ul7o6KTLgufz3J0rH3MhBZZxD1fWjPb4vgzZznvWUdUXBt5FaPQ8lrK7IDTsMjM9b_W3BaGUUKnd1-cEwc5E0hgePoOgYmPIHR-WL4Ywej-8OaslNjNFtlYEBAzamN5st7USUY2bJZ5oqz8gb4wZHD45FuI8M5WA4sMZopUUbgjpAwv19YG3Afu0zmpAlhksxIBUH4QQeMaof5FGcilKmsqqg"/>
<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
<div className="absolute bottom-0 left-0 p-8 text-white">
<h3 className="text-2xl font-black mb-2">Go Karting</h3>
<p className="text-sm font-eventra-label opacity-80">Starting at ₹599</p>
</div>
</div>

<div className="relative h-[400px] rounded-[2rem] overflow-hidden group">
<img className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" data-alt="crystal blue water park slides with children playing and water splashing under bright summer sun" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCZXqvQewR1PDHSb9fAj5y5c34LjMIy9XBPNrcbRKDQ3Qyro5n2kPwaCnpxt10c0Enzt_zHUEKFrmjbxEWCyWLMZFhTCjdAIJFBmx5Z0H6gw_xcgiD0gb2CaH2cgWCGD4X3FZ-pq8QeIW8faEjivHqjPhKtGw7RpMqhGuHFgJTqJO8Xl13nm1JbsOloHb6DdFLQusDmcH2NNm8IwAmsby0mQDnm7Q7MDGWsP1e1dCa-qRF3tmGTiGqgHVNYcOr89_zdr74RS-FUlA"/>
<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
<div className="absolute bottom-0 left-0 p-8 text-white">
<h3 className="text-2xl font-black mb-2">Water Park</h3>
<p className="text-sm font-eventra-label opacity-80">Starting at ₹1,199</p>
</div>
</div>

<div className="relative h-[400px] rounded-[2rem] overflow-hidden group">
<img className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" data-alt="high energy trampoline park with people jumping and neon foam cubes in a dark interior" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC6zFwnkZ-QcJc-_S-JSMLzoJoKKVDT4-G65Vwa7Rwo_msJS9RQzGDBdqxauEq6HtX0w_4X138OakNr7DZGXwTVQAv3AsUfTv_dh-sFae4wUM78wgEzeOR1qbftG6Ej2T_0HeVsTkRpCQD-6OQDdUWg39vajp35ahqwVQrP0sui39K9DypAQVc_S4z1AOsrcM8uCOSDK0KfLSoS9M2_QO6i48aaaRKCU5alLLc2609E1XVB1sbPN183eTU0c77x89YePQdmdwl46g"/>
<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
<div className="absolute bottom-0 left-0 p-8 text-white">
<h3 className="text-2xl font-black mb-2">Bounce Arena</h3>
<p className="text-sm font-eventra-label opacity-80">Starting at ₹399</p>
</div>
</div>

<div className="relative h-[400px] rounded-[2rem] overflow-hidden group">
<img className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" data-alt="exciting laser tag arena with neon green and purple lighting and silhouettes of players" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDHbM9qWQ25zqbSd6u0OwPoLGCGo0VZv0AyCZ7zrlsAsq6Mky5iLXxklGRQdz5yUloH_lGhBLhOGUcvs0ZzedWgrXXfjvQ2OLuEXEHq4_QrewSR8AlZEGXLnnPaNp3ws1sY2XHbmtOmx7OZd92uEDCYb82eJ3wNKJ39yLGl-04v-WVB_Zod-6NZUJAWP0MGUcG6cZEXWxX7pLFsK9VJHWmFnx0D81d9gKM2Uix8NuOjSpTh0Jmx2W40TV414q1mvadMvtKTGomMJQ"/>
<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
<div className="absolute bottom-0 left-0 p-8 text-white">
<h3 className="text-2xl font-black mb-2">Laser Tag</h3>
<p className="text-sm font-eventra-label opacity-80">Starting at ₹450</p>
</div>
</div>
</div>
</div>
</section>

<section className="max-w-[1440px] mx-auto px-8">
<div className="flex justify-between items-center mb-10">
<h2 className="text-3xl font-black font-eventra-headline tracking-tighter">Amusement Parks</h2>
<button className="bg-eventra-surface-container hover:bg-eventra-surface-container-high px-6 py-2 rounded-full font-bold font-eventra-label text-sm transition-colors">See All</button>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-8">

<div className="flex bg-eventra-surface-container-lowest rounded-[2rem] overflow-hidden shadow-[0px_12px_32px_0px_rgba(84,38,228,0.04)] hover:shadow-xl transition-shadow border border-eventra-outline-variant/10">
<div className="w-2/5 relative">
<img className="w-full h-full object-cover" data-alt="majestic roller coaster track against a clear blue sky at an amusement park" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBBANR_GG3upgVywAWV8ch-0sS9gDESpFQcfuGcvU0fAyI_9kSU2fc9bOYk-_ycs2W4l8Gy7odqRIupOPF82Z4qmXQK9oGYyAKM01k5dX9KPhK4F3Fa6p2IFp29il55DnG92MsFIpfI3lw-3_1Wnaa5-_zxdDVzes-Am4IVrvywawykeyvEMhYOI2Pq8-w00gfhvjeLL_S-WomGvD0Jci3s7n714UtJ2DgaUFCFS2QBTyaTlMuHM8xynBtMv8H83wXPcS5dnWpLkg"/>
</div>
<div className="w-3/5 p-8 flex flex-col justify-between">
<div>
<h3 className="text-2xl font-black font-eventra-headline mb-2">Adventure Island</h3>
<p className="text-eventra-on-surface-variant font-eventra-label text-sm">Rohini, New Delhi</p>
<div className="flex gap-2 mt-4">
<span className="bg-eventra-surface-container px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Family Friendly</span>
<span className="bg-eventra-surface-container px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Thrill Rides</span>
</div>
</div>
<div className="flex justify-between items-end">
<div className="flex flex-col">
<span className="text-xs font-eventra-label text-eventra-on-surface-variant">Tickets from</span>
<span className="text-xl font-black">₹499</span>
</div>
<Link to="/eventra/seats/stadium"><button className="bg-eventra-primary text-eventra-on-primary px-8 py-3 rounded-2xl font-bold font-eventra-label hover:scale-105 transition-transform">Book</button></Link>
</div>
</div>
</div>

<div className="flex bg-eventra-surface-container-lowest rounded-[2rem] overflow-hidden shadow-[0px_12px_32px_0px_rgba(84,38,228,0.04)] hover:shadow-xl transition-shadow border border-eventra-outline-variant/10">
<div className="w-2/5 relative">
<img className="w-full h-full object-cover" data-alt="indoor miniature city for children with bright colors and educational play zones" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD8vw4V5NeyYFTTwcJDMncy2SWAZT8p4DagqU9Tfv2AeeISSfwn9YFYBfxQ9cmD44nBX5A1BS5BDK-xt6AtyRPV9XKC75uEne1gOIE-kbFYGEiZPtlcS6Kbr-svVbPxM3n6gMEZKrDUoBa_0Wu82UAHTwrnqiBl_NoyeZP6Nb70ghxri8WOG3STBbQ1b3BJu4arJsn4w9ydRllh0u864rZGkc_XS3iluZC5Vw7QzxpzIboaeeLBXkQ3HZquAraC_jbFVISkesp3sQ"/>
</div>
<div className="w-3/5 p-8 flex flex-col justify-between">
<div>
<h3 className="text-2xl font-black font-eventra-headline mb-2">KidZania</h3>
<p className="text-eventra-on-surface-variant font-eventra-label text-sm">Noida, NCR</p>
<div className="flex gap-2 mt-4">
<span className="bg-eventra-surface-container px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Education</span>
<span className="bg-eventra-surface-container px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Interactive</span>
</div>
</div>
<div className="flex justify-between items-end">
<div className="flex flex-col">
<span className="text-xs font-eventra-label text-eventra-on-surface-variant">Tickets from</span>
<span className="text-xl font-black">₹750</span>
</div>
<Link to="/eventra/seats/cinema"><button className="bg-eventra-primary text-eventra-on-primary px-8 py-3 rounded-2xl font-bold font-eventra-label hover:scale-105 transition-transform">Book</button></Link>
</div>
</div>
</div>
</div>
</section>

<section className="max-w-[1440px] mx-auto px-8">
<div className="bg-gradient-to-br from-eventra-primary via-eventra-primary-container to-[#845ef7] rounded-[3rem] p-12 relative overflow-hidden text-eventra-on-primary">
<div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
<div>
<div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full mb-6">
<span className="material-symbols-outlined text-sm">workspace_premium</span>
<span className="text-xs font-bold font-eventra-label uppercase tracking-widest">Exclusive Access</span>
</div>
<h2 className="text-6xl font-black font-eventra-headline tracking-tighter mb-6 leading-tight">Elevate your city life with Eventra PASS</h2>
<ul className="space-y-4 font-eventra-label">
<li className="flex items-center gap-3">
<span className="material-symbols-outlined text-eventra-primary bg-white rounded-full p-1 text-sm">check</span>
<span className="text-lg font-medium">Free Movie Tickets every month</span>
</li>
<li className="flex items-center gap-3">
<span className="material-symbols-outlined text-eventra-primary bg-white rounded-full p-1 text-sm">check</span>
<span className="text-lg font-medium">Priority access to Concerts &amp; Events</span>
</li>
<li className="flex items-center gap-3">
<span className="material-symbols-outlined text-eventra-primary bg-white rounded-full p-1 text-sm">check</span>
<span className="text-lg font-medium">Flat 50% OFF on Snacks at Cinemas</span>
</li>
</ul>
<button className="mt-10 bg-white text-eventra-primary px-10 py-4 rounded-2xl font-black text-lg hover:scale-105 transition-transform shadow-xl">Get Your PASS Now</button>
</div>
<div className="flex flex-col items-center lg:items-end">
<div className="bg-white p-6 rounded-[2.5rem] shadow-2xl inline-block max-w-[280px]">
<img alt="App Download QR" className="w-full h-auto mb-4 grayscale contrast-125" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBT-vukjvNPNe7nVUEZlr9F3_PS2gGUZ8ATaCiwJRTicDo7hXAEkEwv7xnxTMTD45yEl23ANwNEsejyJ4Q6agmZ8t9XlO44-GZwQeOyXVSwiYm0abC3Hbu68M7EOGGDMSzubc5KmXkGaxey6Z8pX4hWml6hj2oV0vRGs0tc_b1dXycD6lMUZwj0CVV58Aov7p0wF6f9IJyfyniOeA2E7J78pKTHJuP9XA5EH7XcY69Gg50eUajlXuQyi7GW3gTz-cdtbB8e98Tngw"/>
<p className="text-eventra-on-surface font-black text-center text-sm leading-tight">Scan to download the<br/>Eventra App</p>
</div>
<p className="mt-6 text-white/60 font-eventra-label text-sm">Available on iOS and Android</p>
</div>
</div>

<div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
<div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-eventra-primary-container/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4"></div>
</div>
</section>

<section className="max-w-[1440px] mx-auto px-8">
<h2 className="text-3xl font-black font-eventra-headline tracking-tighter mb-10">Artists in your District</h2>
<div className="flex justify-between items-center overflow-x-auto hide-scrollbar gap-12 pb-4">

<div className="flex flex-col items-center min-w-[160px] group cursor-pointer">
<div className="w-32 h-32 rounded-full overflow-hidden mb-4 border-4 border-transparent group-hover:border-primary transition-all duration-300">
<img className="w-full h-full object-cover" data-alt="portrait of a stylish female singer with vibrant traditional jewelry and dramatic stage lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA4O2RmyJn4zfU3skSvvDytQaJUaLpPpHt0dB0hYWZjMsUkvX0CQo0rxeAhwIeThuJ1IoX6onsLlYnB_ienVMNr0AWQiGYfLTO42e_HYFkChd7Rvj1_MvrVGfDQNt3KNo8eB4tE-2seZcrrxanKuklWr5zedav-UUwB5YIUjUJKxuHFJ-v8pB4E_L65iLg1IsJqE_JUTTh4yDEjf8RBBwrHBzT2KpYq4hX77zljo8tObVCZs0Ux9rw14LxzDB6L7v3mr36dZDzHHA"/>
</div>
<h4 className="font-bold font-eventra-headline text-lg">Jasmine Sandlas</h4>
<p className="text-xs font-eventra-label text-eventra-on-surface-variant uppercase tracking-wider mt-1">Singer</p>
</div>

<div className="flex flex-col items-center min-w-[160px] group cursor-pointer">
<div className="w-32 h-32 rounded-full overflow-hidden mb-4 border-4 border-transparent group-hover:border-primary transition-all duration-300">
<img className="w-full h-full object-cover" data-alt="professional portrait of a male musician with a warm smile and casual attire" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAYM06AXy2YL0fBXRkbQLlV-UktjcabUt3t-L0ifKUdYicLwfh2rM5DEQh3IHlE1LOdaYrfhD9Fc9zoJCQp21BTOtuMdVIxaLrNhXlswYOWKNQkZpwGsJEGaTCgQGXyt8AADTYyrp560Rx_hQRi85_qOE0DJJcecLktceV4i1V60GWrkNsfwzU28sfEHL20VY-1_41HdSDlZBkOZ5rnmo6GEgwiOmj8wQVDIM8R3ZKchktjAdtHHzdzJ_uOnwtwpq0RIoVnl1asDg"/>
</div>
<h4 className="font-bold font-eventra-headline text-lg">Javed Ali</h4>
<p className="text-xs font-eventra-label text-eventra-on-surface-variant uppercase tracking-wider mt-1">Singer</p>
</div>

<div className="flex flex-col items-center min-w-[160px] group cursor-pointer">
<div className="w-32 h-32 rounded-full overflow-hidden mb-4 border-4 border-transparent group-hover:border-primary transition-all duration-300">
<img className="w-full h-full object-cover" data-alt="headshot of a famous female comedian with expressive features in high-key studio lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB9Om4bXWAqadpRVOczDMJhTxrGWJODWVjzELJKx-jw2YSOVzUCniUWVkXK5G5zkfVq3wycl0c-O8aoSkTacN-BQaMNsgkl9oArIxK8O1CiVx6AHQOVM4wwnhWAXIJCvn4SPO3ThZqmSPU4_A0xkHotZ8OvfHRpFDhjUFFyr9VXhj3IKAMZIKl-J7DvVOgFQWUA8mgFUnyePCn_mFOru0YSKZVNKsqX3trQenHllMTKbAa-qulSETYLd5ofoJMl2m7IzwiKFSsUpA"/>
</div>
<h4 className="font-bold font-eventra-headline text-lg">Aditi Mittal</h4>
<p className="text-xs font-eventra-label text-eventra-on-surface-variant uppercase tracking-wider mt-1">Comedian</p>
</div>

<div className="flex flex-col items-center min-w-[160px] group cursor-pointer">
<div className="w-32 h-32 rounded-full overflow-hidden mb-4 border-4 border-transparent group-hover:border-primary transition-all duration-300">
<img className="w-full h-full object-cover" data-alt="close-up of a soulful male vocalist performing on stage with atmospheric blue lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCsURan6sg5K-VP-zjDs-PGs6nYgjRBDyvReJyxPCcKvqD5KAVLlFJ3wPje_wbFukiklPwBftuEdHlf7PGBReIILvHMEwEx4mdHuEkNZIQYYEopWdwy2nX5PantVkoKta5cVL1wm-DyNoC5nkbDZKlt0PxDA44xRq3KqEixPnxauDEUeRpX9HWksicq4ukGkS7ta3_k5QfBgN2-iLNIaTz9o3Ah0VuBBVXiRBV_ebPrzsA-7_Vuyc1rVvpSz8D_lnlI6tAxkC6LRQ"/>
</div>
<h4 className="font-bold font-eventra-headline text-lg">Arijit Singh</h4>
<p className="text-xs font-eventra-label text-eventra-on-surface-variant uppercase tracking-wider mt-1">Vocalist</p>
</div>

<div className="flex flex-col items-center min-w-[160px] group cursor-pointer">
<div className="w-32 h-32 rounded-full overflow-hidden mb-4 border-4 border-transparent group-hover:border-primary transition-all duration-300">
<img className="w-full h-full object-cover" data-alt="trendy portrait of a popular male DJ wearing headphones and streetwear in a neon setting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCt6I46Aogd_-ZYyj60U6ffKT56Tdf71ynFiDtKVbCjShiEWorCZGc3tg_6k2W5ZWlFiXyxoe-pB1uKbTzFCxEyufNffh3mjnr8PeHU6_0H_75GHDTE9En4JUS2CkmDCWmvg8-MX2zYUKJBxOmD37mEFWJWC6y9Jyvle3rGAsHnVC0ohjVPm0bor-EbGpyq8THMczYJIPrj0BREmjJOq9Mxj_ndGsVr_YSJfOilRap1QZCt6qM5vcCon3j6eDQIr4yvn7fH2XuArQ"/>
</div>
<h4 className="font-bold font-eventra-headline text-lg">Nucleya</h4>
<p className="text-xs font-eventra-label text-eventra-on-surface-variant uppercase tracking-wider mt-1">DJ • Artist</p>
</div>

<div className="flex flex-col items-center min-w-[160px] group cursor-pointer">
<div className="w-32 h-32 rounded-full overflow-hidden mb-4 border-4 border-transparent group-hover:border-primary transition-all duration-300">
<img className="w-full h-full object-cover" data-alt="glamour portrait of a female playback singer with elegant gown and classic portrait lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB8H1LTaGhVVjdFEL7N2MtSEBAwFJI2nJ0jz9SxIjsO9c-Tt76FUdN_jznoigcQFoT000623gfT9W6xhUXVU1c6cY2gT71QCZTDz2IMOggz3_GZfZbsGsbbbklnG3WLx8kkO1qQKbUgvBY2qPcGCZrdnx5B_wZfyWKuVz1Da6FpAPNUSEFeu1zQBMwezUJiw4j7Hv2bBhdykA6FlOHBHChe5XS2xEBBJyrAQk7-Jdqr7a92SDJPeptqYtB0AgsXGkKdvJMLUOb00g"/>
</div>
<h4 className="font-bold font-eventra-headline text-lg">Shreya Ghoshal</h4>
<p className="text-xs font-eventra-label text-eventra-on-surface-variant uppercase tracking-wider mt-1">Singer</p>
</div>
</div>
</section>

<section className="max-w-[1440px] mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 gap-16">

<div>
<div className="flex justify-between items-center mb-8">
<h2 className="text-2xl font-black font-eventra-headline tracking-tight">Comedy Mania</h2>
<span className="material-symbols-outlined text-eventra-primary cursor-pointer">arrow_forward</span>
</div>
<div className="space-y-6">
<div className="flex gap-6 group cursor-pointer items-center p-4 rounded-3xl hover:bg-eventra-surface-container transition-colors">
<div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0">
<img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" data-alt="vibrant comedy club stage with a microphone stand and brick wall background in warm light" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBmilfWpJnY6usdO9aO0g6n0TkhKcqoRCtSgitd3wEjK7JtKV4oEA-ypDJur_62fNC6-FWLXat1Bz4p2Iinvfm7Iwti_2XnjRB0OrnH6uYeKz8A2yEtLux80ukPy2_53vYIT7a84yaWPCzW-XW3hxNta_BtixmdrsSHHrgNXhYIbGSp7VFdJXQPILJyZdXpGNE5IXejAfa27ueu-bEmk8YoH5kXAkinvyCfqp9OH3NA4OU6Kt6LnrlXJo3AhlIyaW0-ax7YnO3ngw"/>
</div>
<div>
<h4 className="font-bold text-lg mb-1">Standup Special: Zakir Khan</h4>
<p className="text-sm font-eventra-label text-eventra-on-surface-variant">Live at Sirifort • Mar 15</p>
<p className="text-eventra-primary font-bold text-sm mt-2">₹499 onwards</p>
</div>
</div>
<div className="flex gap-6 group cursor-pointer items-center p-4 rounded-3xl hover:bg-eventra-surface-container transition-colors">
<div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0">
<img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" data-alt="close-up of a microphone on a stand in a dimly lit club with purple accent lights" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCk77P7LaulVXer0InYpbCmWbbSJLxVdO0poeK4oNGRPLdPsJWopnT9lQEJr-d3Fct4O2m8Jb1XGsL1y5MqrCal_E0ZweeqaeRBB7XFsEupB6ff9E70jzheJOw0glYFiu9bCgyQqm3xHY76DUN6YMzvI9FZST-Gl4Ile3LJG2_b6yIQaHud3BBhn0F6AD3H7QWZ1hQl6sCNQLPam5pshiXhtaF_1g67fo1qXKBZd8UXeczsFf0zDakvQeQqU1imEoc0QEMG3zI80A"/>
</div>
<div>
<h4 className="font-bold text-lg mb-1">Comedy Open Mic Night</h4>
<p className="text-sm font-eventra-label text-eventra-on-surface-variant">Social CP • Every Tuesday</p>
<p className="text-eventra-primary font-bold text-sm mt-2">Free Entry</p>
</div>
</div>
</div>
</div>

<div>
<div className="flex justify-between items-center mb-8">
<h2 className="text-2xl font-black font-eventra-headline tracking-tight">Nightlife</h2>
<span className="material-symbols-outlined text-eventra-primary cursor-pointer">arrow_forward</span>
</div>
<div className="space-y-6">
<div className="flex gap-6 group cursor-pointer items-center p-4 rounded-3xl hover:bg-eventra-surface-container transition-colors">
<div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0">
<img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" data-alt="energetic nightclub dance floor with laser lights, crowd silhouettes, and smoke effects" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCczoQuPmUy6xHHuda37-Tqp-CFzeDft5kmlRFutJVtUDpg4_8KRWoneKnMYSdHxuvY-0EOD_D-gEt534Ej4db8CuIvvma4UDhkwiQ53IKUbvXZFystLC9iTfzx68MCx5edUfbeXehZ31WlpF_jYGUO3MU_GTbHH0qiyv0q6Ttm1wc8l5yCh_U-kiIxd-XlpgbGl27OkZnpU-I0rA7rayYNSAPakw6Z-s20j7LlaXeQpZLtvgsWCnUP6b01yvcNWlj4YW5K6IhZMQ"/>
</div>
<div>
<h4 className="font-bold text-lg mb-1">Techno Friday Night</h4>
<p className="text-sm font-eventra-label text-eventra-on-surface-variant">PVR Director's Cut • Mar 14</p>
<p className="text-eventra-primary font-bold text-sm mt-2">Cover Charges ₹2000</p>
</div>
</div>
<div className="flex gap-6 group cursor-pointer items-center p-4 rounded-3xl hover:bg-eventra-surface-container transition-colors">
<div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0">
<img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" data-alt="glamourous rooftop bar at night with city lights and craft cocktails on a sleek table" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCusbbJrujeSdJBzp0GNxVs2-qtubz08y6E32C-UD5-5q1nwm3OOMB0ZuuiV0tbmS5jiBdSTRIB6Wx6upGM2DgFaR28Xife363wlel7PKFKoJuqP1gqY1hy5ii5bLtxlu49ylYjXN0mcUXuiWmxi1nc5ia0_BtvBRldKXjTi0zZZLCFiInbw3qUA5YPamgSX9NUlRSHo9yUnDVT3zLLYb_H5OSy14M-_SHuFjhulZ2NqCxoaYlLlb9o10kJiFIv8nmcxiwCpX1A0g"/>
</div>
<div>
<h4 className="font-bold text-lg mb-1">Sky High Rooftop Party</h4>
<p className="text-sm font-eventra-label text-eventra-on-surface-variant">The Sky High • Weekends</p>
<p className="text-eventra-primary font-bold text-sm mt-2">₹1500 onwards</p>
</div>
</div>
</div>
</div>
</section>
</main>

<footer className="bg-[#f5f3f9] dark:bg-[#1c1b1f] w-full mt-20 tonal-shift-bg border-t-0">
<div className="grid grid-cols-1 md:grid-cols-4 gap-12 px-12 py-16 max-w-[1440px] mx-auto">
<div className="space-y-6">
<span className="text-3xl font-black text-[#5426e4] italic">Eventra</span>
<p className="text-[#49454f] font-eventra-label text-sm leading-relaxed">The Digital Curator. Your one-stop destination for all things happening in your city. From movies to matches, we've got you covered.</p>
<div className="flex gap-4">
<span className="material-symbols-outlined text-eventra-primary cursor-pointer opacity-80 hover:opacity-100 transition-opacity">public</span>
<span className="material-symbols-outlined text-eventra-primary cursor-pointer opacity-80 hover:opacity-100 transition-opacity">mail</span>
<span className="material-symbols-outlined text-eventra-primary cursor-pointer opacity-80 hover:opacity-100 transition-opacity">phone</span>
</div>
</div>
<div className="space-y-6">
<h4 className="font-black text-eventra-on-surface uppercase tracking-widest text-xs">Navigation</h4>
<ul className="space-y-4 font-eventra-label text-sm font-medium">
<li><a className="text-[#49454f] hover:text-[#5426e4] underline-offset-4 hover:underline transition-all" href="javascript:void(0)">For you</a></li>
<li><a className="text-[#49454f] hover:text-[#5426e4] underline-offset-4 hover:underline transition-all" href="javascript:void(0)">Movies</a></li>
<li><a className="text-[#49454f] hover:text-[#5426e4] underline-offset-4 hover:underline transition-all" href="javascript:void(0)">IPL 2026</a></li>
<li><a className="text-[#49454f] hover:text-[#5426e4] underline-offset-4 hover:underline transition-all" href="javascript:void(0)">Nightlife</a></li>
</ul>
</div>
<div className="space-y-6">
<h4 className="font-black text-eventra-on-surface uppercase tracking-widest text-xs">Support</h4>
<ul className="space-y-4 font-eventra-label text-sm font-medium">
<li><a className="text-[#49454f] hover:text-[#5426e4] underline-offset-4 hover:underline transition-all" href="javascript:void(0)">Terms &amp; Conditions</a></li>
<li><a className="text-[#49454f] hover:text-[#5426e4] underline-offset-4 hover:underline transition-all" href="javascript:void(0)">Privacy Policy</a></li>
<li><a className="text-[#49454f] hover:text-[#5426e4] underline-offset-4 hover:underline transition-all" href="javascript:void(0)">App Download</a></li>
<li><a className="text-[#49454f] hover:text-[#5426e4] underline-offset-4 hover:underline transition-all" href="javascript:void(0)">Support</a></li>
</ul>
</div>
<div className="space-y-6">
<h4 className="font-black text-eventra-on-surface uppercase tracking-widest text-xs">Download the App</h4>
<div className="bg-white p-4 rounded-3xl inline-block shadow-sm">
<img alt="App Download QR" className="w-32 grayscale contrast-125" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAWfriW4E9DYvsRlXrsZFdUF2z90T5jxBHYDLehMadsUYZWoJ_JPytrUahOWYBJiPUSsAEq4pUM-raOy843Cu3Jl7pgLjNKjkyhx2M2CmTrhrSZ4sbXG3f0JfpveWysMUwYFgqfZ5Ge3l1Mxampq7ruBZr6ovTzeSG__tyLwTjY2v9PNQTJ6QIL65Wn4L0RDKkEEBYzZiWcsWMc9zN-h0dnh1JcW67Rjtd1HaK2rxlQme7f3jodkv0MiXuQUkXuxVP-Mw3OMtTyYQ"/>
</div>
<p className="text-xs font-eventra-label text-eventra-on-surface-variant">© 2024 Eventra. The Digital Curator.</p>
</div>
</div>
</footer>

<div className="md:hidden fixed bottom-0 left-0 right-0 bg-eventra-surface/80 backdrop-blur-xl px-8 py-4 flex justify-between items-center z-50 shadow-[0px_-4px_24px_rgba(0,0,0,0.05)]">
<div className="flex flex-col items-center gap-1 text-[#5426e4]">
<span className="material-symbols-outlined font-variation-settings: 'FILL' 1;">home</span>
<span className="text-[10px] font-bold font-eventra-label">Home</span>
</div>
<div className="flex flex-col items-center gap-1 text-eventra-on-surface-variant">
<span className="material-symbols-outlined">explore</span>
<span className="text-[10px] font-bold font-eventra-label">Explore</span>
</div>
<div className="flex flex-col items-center gap-1 text-eventra-on-surface-variant">
<span className="material-symbols-outlined">confirmation_number</span>
<span className="text-[10px] font-bold font-eventra-label">Bookings</span>
</div>
<div className="flex flex-col items-center gap-1 text-eventra-on-surface-variant">
<span className="material-symbols-outlined">person</span>
<span className="text-[10px] font-bold font-eventra-label">Account</span>
</div>
</div>

    </div>
  );
};

export default EventraLandingPage;
