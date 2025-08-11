import { Card } from '@/components/ui/card';

const features = [
  {
    title: 'Lesson Management',
    description: 'Easily create and track lessons with detailed notes, homework assignments, and progress tracking.',
    icon: '📚'
  },
  {
    title: 'Student Progress',
    description: 'Monitor each student\'s development with skill assessments and practice history.',
    icon: '📈'
  },
  {
    title: 'Resource Library',
    description: 'Organize and share sheet music, tabs, and teaching materials with your students.',
    icon: '🎵'
  },
  {
    title: 'Payment Tracking',
    description: 'Keep track of payments and generate invoices for your teaching services.',
    icon: '💳'
  },
  {
    title: 'Schedule Integration',
    description: 'Connect with Calendly for seamless lesson scheduling and booking.',
    icon: '📅'
  },
  {
    title: 'Gear Recommendations',
    description: 'Provide personalized equipment and learning resource recommendations.',
    icon: '🎸'
  }
];

export function FeaturesSection() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Everything You Need to Excel as a Guitar Teacher
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Our platform combines all the essential tools for modern guitar instruction, 
            helping you focus on what you do best - teaching.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="p-6 text-center hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600">
                {feature.description}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}