import { BLOG_IMAGES } from '@shared/demoImages';
import type { BlogPostData } from '@shared/blogPosts';

// ---------------------------------------------------------------------------
// Dev-harness fallback for #16. Outside Duda there's no dmAPI to read, so
// without this the harness would render "post not found" and there'd be nothing
// to look at. Kept in its own file purely because the body copy is long.
//
// The bodies are HTML because that's what the collection's `content` column
// returns — rendering them exercises the same sanitise-and-inject path the live
// site uses, not a plain-text shortcut.
// ---------------------------------------------------------------------------

const SPRING_BODY = `
<p>As the holiday season approaches, many local homeowners find themselves wrestling with tangled strings of lights, dusty ornaments, and oversized inflatables crammed into an already overflowing garage. What should be a time of festive cheer often turns into a frustrating hunt through garage chaos, where precious holiday decor gets damaged or lost amid the clutter. But there's a better way: self-storage units offer a dedicated, hassle-free space tailored for seasonal items.</p>
<h2>Reason 1: Superior Organization for Effortless Holiday Setup</h2>
<p>When it comes to holiday decor, nothing kills the festive spirit faster than digging through a messy garage piled high with bikes, tools, and forgotten boxes. Self-storage provides a clean, customizable space where you can categorize and label everything, making retrieval a breeze. Unlike the unpredictable garage chaos, self-storage units allow for shelving systems and climate-controlled environments that keep your items in prime condition.</p>
<h3>Streamlining Access with Custom Labeling Systems</h3>
<p>One key subtopic here is implementing labeling strategies in self-storage. Use color-coded bins for different holidays&mdash;red for Christmas, orange for Halloween&mdash;to quickly grab what you need without rummaging.</p>
<h3>Maximizing Space with Vertical Storage Solutions</h3>
<p>Explore how self-storage's ample room allows for stacking shelves and hanging racks, preventing daily floor clutter in garages and making it easier for local families to maintain order.</p>
<h2>Reason 2: Enhanced Protection Against Damage and Pests</h2>
<p>Garage chaos often exposes holiday decor to dust, moisture, rodents, and extreme temperatures, leading to faded colors, broken pieces, or even total ruin. Self-storage facilities, on the other hand, offer climate-controlled units that shield your treasures from these threats, preserving their beauty and value.</p>
<ul>
  <li>Consistent temperature and humidity prevent warping and mildew.</li>
  <li>Sealed units and regular inspections keep pests away from heirlooms.</li>
  <li>Elevated storage and protective coverings keep dust off lights and garlands.</li>
</ul>
<h2>Reason 3: Reclaiming Valuable Home Space Year-Round</h2>
<p>Storing holiday decor in your garage not only creates chaos but also robs you of usable space for everyday needs, like parking your car or setting up a home gym. Self-storage frees up that prime real estate, allowing local homeowners to enjoy a clutter-free garage while keeping seasonal items securely off-site.</p>
<blockquote>A tidy garage appeals to potential buyers in local real estate markets, indirectly increasing your property's attractiveness.</blockquote>
<p>Ready to reset? <a href="#">Find a unit near you</a> and get the season started on the right foot.</p>
`;

const SHORT_BODY = `
<p>Make the most of every square foot. These simple packing strategies help you fit more into your unit and keep the things you reach for most within arm's length.</p>
<h2>Start with a floor plan</h2>
<p>Before the first box goes in, decide which wall holds the things you'll need monthly and which holds the things you won't touch until next year. A two-foot aisle down the middle costs you a little space and saves you an hour every visit.</p>
<h3>Box like with like</h3>
<p>Uniform box sizes stack square and stay square. Mixed sizes leave gaps, and gaps are where towers lean.</p>
<h2>Protect the bottom row</h2>
<p>Anything on the floor should be in a hard-sided container or up on a pallet. Everything heavy goes low, everything fragile goes high, and nothing rests on a mattress.</p>
`;

export const DEMO_POSTS: BlogPostData[] = [
  { id: 'b1', title: 'Spring Cleaning Made Simple: Storage Outlet Has Your Back', author: 'Choshini Perera', date: 'June 10, 2026 @ 5:00pm', timestamp: 9, excerpt: "Don't start the year off with overflowing closets, stuffed garages, and just too much clutter. Here's how a storage unit can help you reset.", image: BLOG_IMAGES[0], href: '/blogs/spring-cleaning-made-simple', slug: 'spring-cleaning-made-simple', tags: ['Storage Advice'], content: SPRING_BODY },
  { id: 'b2', title: '5 Tips for Packing a Storage Unit Efficiently', author: 'Storage Outlet', date: 'Mar 10, 2026 @ 1:15pm', timestamp: 8, excerpt: 'Make the most of every square foot. These simple packing strategies help you fit more and keep your belongings easy to reach.', image: BLOG_IMAGES[1], href: '/blogs/packing-a-storage-unit', slug: 'packing-a-storage-unit', tags: ['Packing'], content: SHORT_BODY },
  { id: 'b3', title: 'How to Choose the Right Storage Unit Size', author: 'Storage Outlet', date: 'Mar 4, 2026 @ 9:00am', timestamp: 7, excerpt: 'From lockers to large drive-up units, picking the right size saves money and hassle. Our guide breaks down what fits where.', image: BLOG_IMAGES[2], href: '/blogs/choosing-a-unit-size', slug: 'choosing-a-unit-size', tags: ['Storage Advice'], content: SHORT_BODY },
  { id: 'b4', title: 'Climate-Controlled Storage: Is It Worth It?', author: 'Storage Outlet', date: 'Feb 26, 2026 @ 11:45am', timestamp: 6, excerpt: "Temperature swings can damage furniture, electronics, and documents. Here's when climate control is worth the upgrade.", image: BLOG_IMAGES[3], href: '/blogs/climate-controlled-storage', slug: 'climate-controlled-storage', tags: ['Technology'], content: SHORT_BODY },
  { id: 'b5', title: 'Got boxes? Everything you need to know about cardboard.', author: 'Storage Outlet', date: 'Feb 18, 2026 @ 8:20am', timestamp: 5, excerpt: 'Single wall, double wall, wardrobe, dish barrel — a plain-English tour of the boxes worth buying and the ones worth skipping.', image: BLOG_IMAGES[4], href: '/blogs/got-boxes', slug: 'got-boxes', tags: ['Packing'], content: SHORT_BODY },
];
