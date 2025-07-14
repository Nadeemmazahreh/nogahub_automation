const bcrypt = require('bcryptjs');
const { User, initDatabase } = require('./models/database');

const createUsers = async () => {
  try {
    await initDatabase();
    
    // Users to create based on your .env file
    const users = [
      { username: 'Nadeem', email: 'nadeem@nogahub.com', password: 'Nadeem123', role: 'admin' },
      { username: 'Issa', email: 'issa@nogahub.com', password: 'Issa123', role: 'admin' },
      { username: 'Kareem', email: 'kareem@nogahub.com', password: 'Kareem123', role: 'user' },
      { username: 'Ammar', email: 'ammar@nogahub.com', password: 'Ammar123', role: 'user' }
    ];

    for (const userData of users) {
      // Hash the password
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      // Create or find user
      const [user, created] = await User.findOrCreate({
        where: { email: userData.email },
        defaults: {
          username: userData.username,
          email: userData.email,
          password: hashedPassword,
          role: userData.role
        }
      });

      if (created) {
        console.log(`✅ Created user: ${userData.email} (${userData.role})`);
      } else {
        console.log(`👤 User already exists: ${userData.email}`);
      }
    }

    const totalUsers = await User.count();
    console.log(`🎉 Total users in database: ${totalUsers}`);
    
    console.log('\n📋 Login credentials:');
    console.log('Admin users:');
    console.log('  admin@nogahub.com / admin123');
    console.log('  nadeem@nogahub.com / Nadeem123');
    console.log('  issa@nogahub.com / Issa123');
    console.log('\nRegular users:');
    console.log('  kareem@nogahub.com / Kareem123');
    console.log('  ammar@nogahub.com / Ammar123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating users:', error);
    process.exit(1);
  }
};

createUsers();